var servidorWebserver = 'ws://' + window.location.hostname + ':8080';
var websocket;
var server = 0;
var meuID;
var logUsers;
var minhaVez = false;
var alocar = false;
var meuTabuleiro;
var sentido = 0;
var tamanhoBarcos = [5, 4, 3, 3, 2];
var tb_index;
var hitX, hitY;

function O(msg){
    return document.getElementById(msg)
}

O('blogin').addEventListener('click', function(){ //espera o click do botão login
	let nick = O('nick').value;
	envia(nick);
	O('blogin').style.visibility ='hidden';
}, false);

O('horizontal').addEventListener('click', function(){ //espera o click do botão login
	sentido = 0;
}, false);

O('vertical').addEventListener('click', function(){ //espera o click do botão login
	sentido = 1;
}, false);

function Clique(i,j){
	console.log(i,j);
	hitX = i;
	hitY = j;
	if (minhaVez) {
		var request = {casaI: i, casaJ: j};
   		websocket.send(JSON.stringify({tipo: "CASA", valor: request}));
	}
}

function invite(convidado) { // recebe um botao com o id do usuario
    //alert("Convidando o usuário "+convidado.id);
    var convite = {FROM: meuID, TO:convidado.id};
    websocket.send(JSON.stringify({tipo: "CONVITE", valor: convite}));
}

window.onload = function() {
	let tplayer = O('player')
	let tinimigo = O('inimigo')
	let texto1 = 'Este é o seu tabuleiro<br><table>'
	let texto2 = 'Este é o tabuleiro inimigo<br><table>'
	for(let i = 1; i <= 10; i++){
		texto1 += '<tr>'
		texto2 += '<tr>'
		for(let j = 0; j < 10; j++){
			texto1 += '<td><div class="casas" onclick="alocarBarcos('+(i-1)+','+j+')" id="A'+(i-1)+''+j+'"></div></td>'
			texto2 += '<td><div class="casas" onclick="Clique('+(i-1)+','+j+')" id="B'+(i-1)+''+j+'"></div></td>'
		}
		texto1 += '</tr>'
		texto2 += '</tr>'
	}
	texto1 += '</table>'
	texto2 += '</table>'
	tplayer.innerHTML = texto1;
	tinimigo.innerHTML = texto2;
}

function userList(lista){ //escreve no html os users conectados e cria o botão de convite
    var painel = document.getElementById('userList');
    var texto = "";
    for(var i = 0; i < lista.length; i++)
    {
        if(lista[i] != meuID && lista[i] != null)
        {
            texto += lista[i] +" <button id=\""+lista[i]+"\" class='conv_but' onclick=\"invite(this)\">Convidar</button> <br />";
        }
    }

    if(texto != logUsers)
    {
        painel.innerHTML = texto;
        logUsers = texto;
    }
}

function atualizaTabuleiro(){
	for(let i = 0; i < 10; i++){
		for(let j = 0; j < 10; j++){
			if(meuTabuleiro[i][j] == 0){
				O('A'+i+j).style.backgroundColor = "blue";
			}
			else if(meuTabuleiro[i][j] == 1){
				O('A'+i+j).style.backgroundColor = "red";
			}
			else if(meuTabuleiro[i][j] == 2){
				O('A'+i+j).style.backgroundColor = "black";
			}
			else if(meuTabuleiro[i][j] == 3){
				O('A'+i+j).style.backgroundColor = "yellow";
			}
		}
	}
}

function barcoHorizontal(i,j,tamanho){
	if(j+tamanho <= 10){
		for(let k = j; k < j + tamanho; k++){
			meuTabuleiro[i][k] = 1;
		}
		return 1;
	}
	else{
		return 0;
	}
}

function barcoVertical(i,j,tamanho){
	if(i+tamanho <= 10){
		for(let k = i; k < i + tamanho; k++){
			meuTabuleiro[k][j] = 1;
		}
		return 1;
	}
	else{
		return 0;
	}
}

function alocarBarcos(i,j){
	if(alocar){
		var sucesso;
		tamanho = tamanhoBarcos[tb_index];
		if(sentido == 0){
			sucesso = barcoHorizontal(i,j,tamanho);
			if (sucesso == 1){
				tb_index++;
				atualizaTabuleiro();
			}
		}
		else{
			sucesso = barcoVertical(i,j,tamanho);
			if (sucesso == 1){
				atualizaTabuleiro();
				tb_index++;
			}
		}
		console.log(i,j);
		if(tb_index == 5){
			alocar = false;
			let MSG = {tipo: 'TABULEIRO_UP', tabuleiro: meuTabuleiro};
    		websocket.send(JSON.stringify(MSG))
		}
	}
}

//------------------------------------------------------------WS
function envia(nick) { //inicia conexão com o servidor
     let dadosUsuario = {ID:nick};
     startConnection(dadosUsuario);
     meuID = nick
     dadosUsuario = JSON.stringify(dadosUsuario);
     //localStorage.setItem('DADOS',dadosUsuario);
}

function startConnection(id) //estabele as funções específicas do websocket
{
    meuID = id;
    websocket = new WebSocket(servidorWebserver)
    websocket.onopen = function(evt)
    {
        onOpen(evt)
    }
    websocket.onclose = function(evt)
    {
        onClose(evt)
    }
    websocket.onmessage = function(evt)
    {
        onMessage(evt)
    }
}

function onOpen(evt) //ao conectar
{
    console.log('onOpen')
    let MSG = {tipo: 'LOGIN' ,valor: meuID};
    websocket.send(JSON.stringify(MSG))
	
}

function onClose(evt) //ao desconectar
{
    console.log('onClose');
    servidorWebserver = 'ws://' + window.location.hostname + ':8081';
    console.log(servidorWebserver);
    envia(meuID);
}

function onMessage(evt) //ao receber mensagem
{
    var msg = evt.data;
    msg = JSON.parse(msg);
    switch (msg.tipo)
    {
	case 'NAMES': //nomes dos outros clientes
		console.log('names');
		userList(msg.valor);
		break;
	case 'CONVITE':
		console.log('convite');
		var resp = confirm("Convite de partida de "+msg.valor.FROM+", deseja aceitar?");
		let msg2 = {tipo:'JOGO', player1: msg.valor.FROM, player2: msg.valor.TO, valor: msg.valor}
		if(resp) {
			msg2.valor.resp = true;
			tb_index = 0;
			alocar = true;
			alert("Vez do Oponente");            
		} else {
			msg2.valor.resp = false;
		}
		websocket.send(JSON.stringify(msg2));
		break;
	case 'COMECO_JOGO':
		console.log('comeco_jogo');
		if(msg.resposta){
			alert('Seu convite foi aceito');
			meuTabuleiro = msg.tabuleiro;
			tb_index = 0;
			alocar = true;
			minhaVez = true;//--------------------------------------------------------------------------------------------------------------------
			O('inimigo').style.backgroundColor = "lightgrey";
			O('player').style.backgroundColor = "white";
		}
		else{
			alert('Seu convite não foi aceito')	
		}
		break;
	case 'TABULEIRO':
		console.log('tabuleiro');
		meuTabuleiro = msg.tabuleiro;
		alocar = true;
		break;
	case 'HIT':
		minhaVez = false;
		O('inimigo').style.backgroundColor = "white";
		O('player').style.backgroundColor = "lightgrey";
		console.log('hit: ', msg.hit);
		if(msg.hit == 1){
			O('B'+(hitX)+''+hitY).style.backgroundColor = "red";
		}
		if(msg.hit == 0){
			O('B'+(hitX)+''+hitY).style.backgroundColor = "blue";
		}
		break;
	case 'VEZ':
		meuTabuleiro[msg.x][msg.y] = msg.hit + 2;
		atualizaTabuleiro();
		minhaVez = true;
		O('inimigo').style.backgroundColor = "lightgrey";
		O('player').style.backgroundColor = "white";
		break;
	default:
		console.log('comando nao reconhecido: ' + msg.tipo);
		break;
    }
    //console.log('OnMessage');
}
