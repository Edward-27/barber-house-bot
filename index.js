const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

let etapaCliente = {}; // controle de etapas da conversa por número de telefone

const axios = require('axios');

app.post('/webhook', async (req, res) => {
  const mensagem = req.body.text.message;
  const numero = req.body.phone;

  // Lógica para processar a mensagem e gerar uma resposta
  const resposta = 'Obrigado por entrar em contato!';

  // Enviar a resposta utilizando a API da Z-API
  await axios.post('https://api.z-api.io/instances/3E0F190D0FF7D05DD42696870211A73F/token/E9B4130908ADE432C458BAD2/send-message', {
    phone: numero,
    message: resposta
  });

  res.sendStatus(200);
});

  let resposta = '';

  if (!etapaCliente[numero]) {
    etapaCliente[numero] = { etapa: 1 };
    resposta = 'Olá! Bem-vindo à *Barber House*! 💈\nQual o seu *nome*?';
  } else {
    const etapa = etapaCliente[numero].etapa;

    if (etapa === 1) {
      etapaCliente[numero].nome = mensagem;
      etapaCliente[numero].etapa = 2;
      resposta = `Muito bem, ${mensagem}!\nPara qual *dia da semana* você quer agendar? (Ex: segunda, terca, sexta, sabado)`;
    } else if (etapa === 2) {
      const dia = mensagem.toLowerCase();
      const horarios = JSON.parse(fs.readFileSync('horarios.json'));
      const agendamentos = JSON.parse(fs.readFileSync('agendamentos.json'));

      if (!horarios[dia]) {
        resposta = 'Dia inválido. Tente: segunda, terca, quarta, quinta, sexta ou sabado.';
      } else {
        const horariosDisponiveis = horarios[dia].filter(hora => {
          return !agendamentos.some(a => a.dia === dia && a.horario === hora);
        });

        if (horariosDisponiveis.length === 0) {
          resposta = `Ops! Não há mais horários disponíveis para *${dia}*. Tente outro dia.`;
        } else {
          etapaCliente[numero].dia = dia;
          etapaCliente[numero].etapa = 3;
          resposta = `Esses são os horários disponíveis para *${dia}*:\n` +
            horariosDisponiveis.map((h, i) => `${i + 1}. ${h}`).join('\n') +
            `\n\nEscolha o número do horário.`;
          etapaCliente[numero].opcoes = horariosDisponiveis;
        }
      }
    } else if (etapa === 3) {
      const index = parseInt(mensagem) - 1;
      const opcoes = etapaCliente[numero].opcoes;

      if (isNaN(index) || index < 0 || index >= opcoes.length) {
        resposta = 'Escolha um número válido de horário.';
      } else {
        const agendamentos = JSON.parse(fs.readFileSync('agendamentos.json'));
        const novo = {
          nome: etapaCliente[numero].nome,
          dia: etapaCliente[numero].dia,
          horario: opcoes[index],
          telefone: numero
        };
        agendamentos.push(novo);
        fs.writeFileSync('agendamentos.json', JSON.stringify(agendamentos, null, 2));

        resposta = `✅ Prontinho, ${novo.nome}!\nSeu corte foi agendado para *${novo.dia}* às *${novo.horario}*.\nTe esperamos na Barber House! 💈✂️`;
        delete etapaCliente[numero];
      }
    }
  }

  res.send({ reply: resposta });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT} 🚀`);
});
