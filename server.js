const express = require('express');
const cors = require('cors');
const { kv } = require('@vercel/kv'); // Banco de dados gratuito da Vercel
const app = express();

app.use(cors());
app.use(express.json());

// Rota GET para ler todas as respostas guardadas
app.get('/api/ver-respostas', async (req, res) => {
    try {
        // Busca a lista na nuvem (se não existir, assume um array vazio)
        const dados = await kv.get('respostas') || [];
        return res.status(200).json(dados);
    } catch (error) {
        console.error("Erro no KV:", error);
        return res.status(500).json({ erro: 'Erro ao ler dados do banco.' });
    }
});

// Rota POST para guardar uma nova resposta
app.post('/api/guardar-resposta', async (req, res) => {
    try {
        const novaResposta = req.body;
        
        if (!novaResposta || Object.keys(novaResposta).length === 0) {
            return res.status(400).json({ erro: 'Dados vazios.' });
        }

        // Pega as respostas atuais que estão guardadas na nuvem
        let dadosExistentes = await kv.get('respostas') || [];
        
        // Adiciona a nova
        dadosExistentes.push(novaResposta);
        
        // Salva de volta na nuvem
        await kv.set('respostas', dadosExistentes);

        return res.status(200).json({ mensagem: 'Resposta adicionada com sucesso!' });
    } catch (error) {
        console.error("Erro no KV:", error);
        return res.status(500).json({ erro: 'Erro ao guardar dados no banco.' });
    }
});

// IMPORTANTE: Para o Express funcionar no Vercel, exportamos o app
module.exports = app;

app.listen(3000, () => console.log('Servidor central a correr na porta 3000'));


// // server.js
// const express = require('express');
// const fetch = require('node-fetch');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;
// const cors = require('cors');
// const path = require('path');

// app.use(cors());
// app.use(express.json());

// // Servir arquivos estáticos da pasta 'public'
// app.use(express.static(path.join(__dirname, 'public')));

// // Servir também arquivos da pasta raiz (para o index.html)
// app.use(express.static(__dirname));

// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_KEY = process.env.SUPABASE_KEY;

// // Rota para servir a página de boas-vindas
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html')); 
// });

// // ... resto do seu código

// // Buscar estado do LED
// app.get('/api/led', async (req, res) => {
//   try {
//     const response = await fetch(`${SUPABASE_URL}/rest/v1/led_state?id=eq.1`, {
//       headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
//     });

//     if (!response.ok) throw new Error('Erro ao buscar dados do Supabase');

//     const data = await response.json();
//     if (data.length > 0) {
//       res.json({ isOn: data[0].state, online: data[0].online || false });
//     } else {
//       res.status(404).json({ message: 'Estado do LED não encontrado.' });
//     }
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Atualizar estado do LED
// app.patch('/api/led', async (req, res) => {
//   const { isOn, online } = req.body;
//   if (typeof isOn !== 'boolean' || typeof online !== 'boolean') {
//     return res.status(400).json({ error: 'Os campos "isOn" e "online" devem ser booleanos.' });
//   }

//   try {
//     const response = await fetch(`${SUPABASE_URL}/rest/v1/led_state?id=eq.1`, {
//       method: 'PATCH',
//       headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ state: isOn, online: online }),
//     });

//     if (!response.ok) throw new Error('Erro ao atualizar o estado do LED no Supabase');

//     res.json({ message: `LED ${isOn ? 'ligado' : 'desligado'}, online: ${online}` });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
