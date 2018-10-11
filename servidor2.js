var express = require('express')
var app = express();
var bodyParser = require('body-parser');
const WebSocket = require('ws');
var Users=[];
var Jogos=[];
var http = require('http')

const TIMEOUT = 10000;

const wss = new WebSocket.Server({ port: 8081 },function ()
{
    console.log('SERVIDOR WEBSOCKETS na porta 8081');
});

function PERIODICA () //verifica se o usuário não excedeu o time out
{
    let agora = Date.now();

    let x=0;
    while (x < Users.length)
    {
        if ((Users[x].validado==false) && ((agora - Users[x].timestamp) > TIMEOUT ) )
        {
            let MSG = {tipo:'ERRO',valor:'timeout'};
            Users[x].send(JSON.stringify(MSG));
            Users[x].close();
            Users.splice(x, 1);
            userListUpdate();
        }
        else x++;
    }
}

function userListUpdate() //atualiza os usuários nos cliente para possibilitar convites
{
    var userList = [];
	userList.push();
    for(var i = 0; i < Users.length; i++){
		if(Users[i].validado == true){    
	        userList.push(Users[i].nome);
        }
    }
    let MSG = {tipo: 'NAMES', valor: userList};
    broadcast(MSG);
	console.log(userList);
}

function broadcast (msg){ //envia mensagem para todos os clientes conectados
    for(let x=0; x < Users.length; x++){
        try{
            if (Users[x].validado==true)
                Users[x].send(JSON.stringify(msg));
        }
        catch(e){

        }
    }
}

function direct(para, msg) { //envia mensagem exclusiva para o cliente especificado
	for(let x=0;x<Users.length;x++){
		try {
			if (Users[x].nome == para)
				Users[x].send(JSON.stringify(msg)); 
			}
		catch (e){
			
		}
	}  
}

function criaTabuleiro(){ //cria um vetor que simula o tabuleiro para uma partida
	let tabuleiro = new Array(10)
	for(let i = 0; i < 10; i++){
		tabuleiro[i] = new Array(10)
	}
    for(i = 0; i < 10; i++) {
        for(let j = 0; j < 10; j++){
            tabuleiro[i][j] = 0;
        }
        
    }
	return tabuleiro;
}

function retorna_hit(i,j,player,j_index){
    if(player == 1){
        hit = Jogos[j_index].tabuleiro2[i][j];
    }
    else{
        hit = Jogos[j_index].tabuleiro1[i][j];
    }
    return hit;
}

wss.on('connection', function connection(ws) //função do websocket ao receber uma nova conexão de cliente
{
    ws.validado=false;
    ws.timestamp = Date.now();
    Users.push(ws);

    ws.on('close', function close() //função ativada pela saída de um cliente
    {
        for (let x=0; x<Users.length; x++)
        {
            if (Users[x]==ws)
            {
                Users.splice(x, 1);
                break;
            }
        }
		userListUpdate();
    });

    ws.on('message', function incoming(MSG) //função ativada por mensagens
    {
        MSG = JSON.parse(MSG);
        if (MSG.tipo=='LOGIN') //login de usuário
        {
            //console.log(MSG.value)
            console.log('ID=',MSG.valor)

            ws.nome = MSG.valor;
            ws.validado = true;
            userListUpdate();
        }
        else if(MSG.tipo == 'CONVITE'){ //convite do usuário FROM para o usuário TO
            console.log(""+MSG.valor.FROM+" está convidando "+MSG.valor.TO);
            direct(MSG.valor.TO, MSG);
        }
		else if(MSG.tipo == 'JOGO'){
            if(MSG.valor.resp == true) {
                console.log(""+MSG.valor.TO+" aceitou o convite de "+MSG.valor.FROM);
                tabuleiro1 = criaTabuleiro();
                tabuleiro2 = criaTabuleiro();
                let partida = { player1: MSG.valor.FROM,
                                player2: MSG.valor.TO,
                                tabuleiro1: tabuleiro1,
                                tabuleiro2: tabuleiro2,
                                vez: MSG.valor.FROM}
                Jogos.push(partida);
                let msg2 = {tipo: 'COMECO_JOGO', resposta: true, tabuleiro: tabuleiro1};
                direct(MSG.valor.FROM, msg2);
                let msg3 = {tipo: 'TABULEIRO', tabuleiro: tabuleiro2};
                direct(MSG.valor.TO, msg3);
            }
            else{
                console.log(""+MSG.valor.TO+" recusou o convite de "+MSG.valor.FROM);
                let msg2 = {tipo: 'COMECO_JOGO', resposta: false};
                direct(MSG.valor.FROM, msg2);
            }
		}
        else if(MSG.tipo == 'CASA'){
            //console.log('casa');
            var hit = -1;
            var vezDe;
            for (let i = 0; i < Jogos.length; i++) {
                if(ws.nome == Jogos[i].player1){
                    if(ws.nome == Jogos[i].vez){
                        hit = retorna_hit(MSG.valor.casaI, MSG.valor.casaJ,1,i);
                        Jogos[i].vez = Jogos[i].player2;
                        vezDe = Jogos[i].player2;
                    }
                }
                else if(ws.nome == Jogos[i].player2){
                    if(ws.nome == Jogos[i].vez){
                        hit = retorna_hit(MSG.valor.casaI, MSG.valor.casaJ,2,i);
                        Jogos[i].vez = Jogos[i].player1;
                        vezDe = Jogos[i].player1;
                    }
                }
            }
            if(hit != -1){
                let msg2 = {tipo: 'HIT', hit: hit};
                direct(ws.nome, msg2);
                let msg3 = {tipo: 'VEZ', hit: hit, x: MSG.valor.casaI, y: MSG.valor.casaJ};
                direct(vezDe, msg3);
            }
        }
        else if(MSG.tipo == 'TABULEIRO_UP'){
            //console.log('tabuleiro_up');
            for (let i = 0; i < Jogos.length; i++) {
                if(ws.nome == Jogos[i].player1){
                    Jogos[i].tabuleiro1 = MSG.tabuleiro;
                }
                else if(ws.nome == Jogos[i].player2){
                    Jogos[i].tabuleiro2 = MSG.tabuleiro;
                }
            }
        }
        else{
            console.log('mensagem incomum')
        }
        // confirmação de recebimento
        let feedback = {tipo: 'ALIVE'};
        direct(ws.nome, feedback);
    });
});

// parte da comunicação em ajax
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.listen(3001, function()
{
    console.log('SERVIDOR WEB na porta 3001');
});

setInterval (PERIODICA,100);
