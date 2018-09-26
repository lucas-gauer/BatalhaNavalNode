var servidorWebserver = 'ws://' + window.location.hostname + ':8080';
var websocket;
var meuID;
var logUsers;
var minhaVez = false;

function O(msg){
    return document.getElementById(msg)
}

O('blogin').addEventListener('click', function(){ //espera o click do botão login
	let nick = O('nick').value;
	envia(nick)
	O('blogin').style.visibility ='hidden'
}, false);

function Clique(i,j){
	console.log(i + ' ' + j)
	if (minhaVez) {
		var request = {casaI: i, casaJ: j};
   		websocket.send(JSON.stringify({tipo: "CONVITE", valor: request}));
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
			texto1 += '<td><div class="casas" onclick="Clique('+(i-1)+','+j+')">hue</div></td>'
			texto2 += '<td><div class="casas">hue</div></td>'
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
    websocket = new ReconnectingWebSocket(servidorWebserver)
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
    console.log('onClose')
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
			alert("Vez do Oponente");            
		} else {
			msg2.valor.resp = false;
		}
		websocket.send(JSON.stringify(msg2));
		break;
	case 'COMECO_JOGO':
		console.log('COMECO_JOGO')
		if(msg.resposta){
			alert('Seu convite foi aceito')
		}
		else{
			alert('Seu convite não foi aceito')	
		}
		break;
	default:
		console.log('comando nao reconhecido: ' + msg.tipo);
		break;
    }
    console.log('OnMessage');
}