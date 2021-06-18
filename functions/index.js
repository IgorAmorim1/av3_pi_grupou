const functions = require("firebase-functions");
const admin = require('firebase-admin');
const express = require('express');
const Chance = require('chance');
const params = require('./config/parametros.js')();
const { uuid } = require('uuidv4');

admin.initializeApp();
const db = admin.firestore();

var app = express();

// cadastra mock de turma aleatória
// retorna id_turma
app.get('/turma/mock', async (req, res) => {
	const { turma, hardskills_atividade } = params;
	const chance = new Chance(turma);
	require('./ClassroomGenerate.js')(chance)

	// var fs = require('fs');
	const { alunos, analise_hardskills_turma } = chance.classroom(params);
	
	let id_turma = uuid();

	await db.collection('turmas').doc(id_turma).set({
		alunos,
		analise: analise_hardskills_turma,
		hardskills_atividade
	});
	
	return res.send({
		msg:'turma gerada com sucesso',
		id_turma: id_turma
	});
});

app.post('/turma/analisar/', async (req, res) => {
	
	let { id_grupos } = req.body;

	if(!id_grupos) return res.send({'fail':'id_grupos é obrigatorio'});

	let grupos = await db.collection('agrupamento').doc(id_grupos).get();

	if(!grupos.exists) {
		return res.send({
			msg: 'agrupamento nao existe'
		});
	}

	let min_deficit_distribuicao = 100;
	let max_deficit_distribuicao = 0;

	let min_softskill = 100;
	let max_softskill = 0;

	for (let g in grupos.grupos) {

	  let grupo = grupos.grupos[g]
	  // console.log(g, grupo)

	  let total_integrantes = grupo.length;
	  let softskills = [];
	  let conhecimento_grupo = {
	    hardskills: {},
	    total_conhecimento_hardskills: 0,
	  }

	  for (let a in grupo) {
	    let aluno = grupo[a];

	    for (let s in aluno.softskills) {
	      let softskill = aluno.softskills[s];
	      if (!softskills.includes(softskill)) {

	        softskills.push(softskill);
	      }
	    }

	    for (let h in aluno.hardskills) {
	      let hardskill = aluno.hardskills[h];

	      conhecimento_grupo.total_conhecimento_hardskills += hardskill.nota;
	      if (!conhecimento_grupo.hardskills.hasOwnProperty(h)) {
	        conhecimento_grupo.hardskills[h] = {
	          total_pontos: hardskill.nota
	        }
	      } else {
	        conhecimento_grupo.hardskills[h].total_pontos += hardskill.nota
	      }

	    }

	  }

	  let deficit_distribuicao = 0;

	  for (let h in conhecimento_grupo.hardskills) {
	    let hardskill = conhecimento_grupo.hardskills[h]

	    conhecimento_grupo.hardskills[h].percentual = (hardskill.total_pontos * 100) / conhecimento_grupo.total_conhecimento_hardskills

	    // console.log(grupos.hardskills_atividade)

	    if (conhecimento_grupo.hardskills[h].percentual < grupos.hardskills_atividade[h].peso) {
	      let deficit = grupos.hardskills_atividade[h].peso - conhecimento_grupo.hardskills[h].percentual;
	      deficit_distribuicao += deficit;
	      // console.log(g, h, conhecimento_grupo.hardskills[h].percentual, grupos.hardskills_atividade[h].peso, deficit)
	    } else {
	      // console.log(g, h, conhecimento_grupo.hardskills[h].percentual, grupos.hardskills_atividade[h].peso)
	    }

	  }

	  if (deficit_distribuicao < min_deficit_distribuicao) {
	    min_deficit_distribuicao = deficit_distribuicao
	  }

	  if (deficit_distribuicao > max_deficit_distribuicao) {
	    max_deficit_distribuicao = deficit_distribuicao
	  }


	  conhecimento_grupo['deficit_hardskills_absoluto'] = deficit_distribuicao;
	  console.log(g, conhecimento_grupo['deficit_hardskills_absoluto'])

	  // console.log(g, softskills.length / total_integrantes);

	  conhecimento_grupo['media_softskills'] = softskills.length / total_integrantes

	  if (conhecimento_grupo['media_softskills'] < min_softskill) {
	    min_softskill = conhecimento_grupo['media_softskills']
	  }

	  if (conhecimento_grupo['media_softskills'] > max_softskill) {
	    max_softskill = conhecimento_grupo['media_softskills']
	  }


	  grupos.grupos[g] = {
	    conhecimento_grupo
	  }

	}

	console.log(min_deficit_distribuicao, max_deficit_distribuicao)
	console.log(min_softskill, max_softskill)


	let gap_softskill = 0;
	
	for (let cg in grupos.grupos) {
	  let grupo = grupos.grupos[cg].conhecimento_grupo
	  console.log(grupo.media_softskills)
	  let gap = (max_softskill - grupo.media_softskills) /
	    (max_softskill - min_softskill)
	  console.log("gap_softskill", gap)


	  if (gap > 0 && gap < 1) {
	    gap_softskill += gap
	  }

	}


	let gap_hardskill = 0;
	
	for (let cg in grupos.grupos) {
	  let grupo = grupos.grupos[cg].conhecimento_grupo
	  console.log(grupo.deficit_hardskills_absoluto)
	  let gap = (min_deficit_distribuicao - grupo.deficit_hardskills_absoluto) /
	    (min_deficit_distribuicao - max_deficit_distribuicao)
	  console.log("gap", gap)

	  grupos.grupos[cg].conhecimento_grupo['deficit_hardskills_relativo'] = grupo.deficit_hardskills_absoluto * gap
	  if (gap > 0 && gap < 1) {
	    gap_hardskill += gap
	  }

	}

	let analise = {
	  grupos: grupos.grupos,
	  gap_hardskill: gap_hardskill,
	  gap_softskill: gap_softskill,
	  acuracia: 100 - (9 * gap_hardskill) + (1 * gap_softskill)
	}

	console.log(analise)

	return res.send({
		msg:'Grupos analisados com sucesso',
		analise: analise
	});

});



function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// retorna grupos organizados de forma randomica
// exemplo de payload:
// {
// 	id_turma: [INT]
// 	qtd_grupos: [INT],
// }
app.post('/turma/agrupar/random', async (req, res) => {

	let {id_turma, qtd_grupos } = req.body;

	console.log(id_turma);

	if(!id_turma) return res.send({'fail':'id_turma é obrigatorio'});
	if(!qtd_grupos) return res.send({'fail':'qtd_grupos é obrigatorio'});

	let turma = await db.collection('turmas').doc(id_turma).get();

	if(!turma.exists) {
		return res.send({'fail':'turma nao existe'});
	}

	turma = turma.data();

	let total_alunos = turma.alunos.length;
	let quantidade_grupos = total_alunos / qtd_grupos;
	// console.log(total_alunos / argv.q)

	grupos = {}

	for (let i = 0; i < quantidade_grupos; i++) {
	  grupos[`grupo_${i + 1}`] = []
	}
	
	let grupo_corrente = 1;

	while (turma.alunos.length > 0) {
	  // console.log(grupo_corrente, quantidade_grupos)
	  if (grupo_corrente > Math.ceil(quantidade_grupos)) grupo_corrente = 1;
	  console.log('grupo_corrente', grupo_corrente)
	  let posicao = getRandomInt(1, turma.alunos.length) - 1
	  console.log(' posicao', posicao, turma.alunos.length)
	  let aluno = turma.alunos[posicao]

	  grupos[`grupo_${grupo_corrente}`].push(aluno)

	  // console.log(aluno)
	  turma.alunos.splice(posicao, 1);
	  grupo_corrente += 1;
	}

	let id_grupo = uuid();

	await db.collection('agrupamento').doc(id_grupo).set(grupos);

	return res.send({
		msg:'agrupamento realizado com sucesso',
		id_grupos: id_grupo 
	});

});

// retorna grupos organizados com algoritmo 
// exemplo de payload:
// {
// 	id_turma: [INT]
// 	qtd_grupos: [INT],
// }
app.post('/turma/agrupar/gpask', async (req, res) => {
	console.log(req.body)
	let {id_turma, qtd_grupos } = req.body;

	console.log(id_turma);

	if(!id_turma) return res.send({'fail':'id_turma é obrigatorio'});
	if(!qtd_grupos) return res.send({'fail':'qtd_grupos é obrigatorio'});

	let turma = await db.collection('turmas').doc(id_turma.toString()).get();

	if(!turma.exists) {
		return res.send({'fail':'turma nao existe'});
	}

	turma = turma.data();
	let total_alunos = turma.alunos.length-1; // ultimo é o peso, desconsiderando
	let quantidade_grupos = total_alunos / qtd_grupos;

	grupos = {};

	let somatorio = (accumulator, currentValue) => accumulator + currentValue;
	let media = (values_arr) => values_arr.reduce(somatorio) / values_arr.length;

	// criação dos grupos
	for (let i = 0; i < quantidade_grupos; ++i) {
	  grupos[`grupo_${i + 1}`] = [];
	}

	let { hardskills_atividade : pesos} = turma;

	// media geral
	for(let i = 0; i < total_alunos; ++i) {
	  let {API, REST, Firebase} = turma.alunos[i].hardskills;
	  // media das hardskill considerando o peso
	  turma.alunos[i].media_geral = media([
	    pesos.API.peso * media([API.nota, API.diferenca_absoluta_media, API.gap]),
	    pesos.REST.peso * media([REST.nota, REST.diferenca_absoluta_media, REST.gap]),
	    pesos.Firebase.peso * media([Firebase.nota, Firebase.diferenca_absoluta_media, Firebase.gap])
	  ]);
	}

	// criando lista ordenada de alunos por media geral

	let alunos = [];

	for(let i = 0; i < total_alunos; ++i) {
	  alunos.push(turma.alunos[i]);
	}

	alunos.sort((a, b) => a.media_geral - b.media_geral);

	// os melhores alunos serão distribuidos para grupos diferentes

	let grupo_count = 0;

	while (alunos.length !== 0) {
	  if(grupo_count >= quantidade_grupos) grupo_count = 0;
	  grupos[`grupo_${grupo_count+1}`].push(alunos.pop());
	  grupo_count++;
	}

	let id_grupo = uuid();

	await db.collection('agrupamento').doc(id_grupo).set(grupos);

	return res.send({
		msg:'agrupamento realizado com sucesso',
		id_grupos: id_grupo 
	});

});


exports.grupou = functions.https.onRequest(app);