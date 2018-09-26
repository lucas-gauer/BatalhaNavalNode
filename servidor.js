var express = require('express')
var app = express();
var bodyParser = require('body-parser');
const WebSocket = require('ws');
var Users=[];
var Jogos=[];
var http = require('http')

const TIMEOUT = 10000;

const wss = new WebSocket.Server({ port: 8080 },function ()
{
    console.log('SERVIDOR WEBSOCKETS na porta 8080');
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
            tabuleiro[i][j] = i*10+j;
        }
        
    }
	return tabuleiro;
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
                                vez: 1}
                Jogos.push(partida);
                let msg2 = {tipo: 'COMECO_JOGO', resposta: true}
                direct(MSG.valor.FROM, msg2);
            }
            else{
                console.log(""+MSG.valor.TO+" recusou o convite de "+MSG.valor.FROM);
                let msg2 = {tipo: 'COMECO_JOGO', resposta: false}
                direct(MSG.valor.FROM, msg2);
            }
		}
        else{
            console.log('mensagem incomum')
        }
    });
});

// parte da comunicação em ajax
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.listen(3000, function()
{
    console.log('SERVIDOR WEB na porta 3000');
});

setInterval (PERIODICA,100);
