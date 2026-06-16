const express = require('express');
const cors = require('cors');
const { put, list } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());

// Rota POST para salvar as respostas
app.post('/api/guardar-resposta', async (req, res) => {
    try {
        const novaResposta = req.body;

        if (!novaResposta || Object.keys(novaResposta).length === 0) {
            return res.status(400).json({ erro: 'Dados vazios.' });
        }

        let dadosExistentes = [];
        let urlArquivoAtual = null;

        // 1. Procurar se já existe um arquivo 'respostas.json' no seu Storage
        try {
            const { blobs } = await list();
            const arquivoBlob = blobs.find(b => b.pathname === 'respostas.json');
            
            if (arquivoBlob) {
                urlArquivoAtual = arquivoBlob.url;
                // Faz o download do conteúdo atual do arquivo JSON
                const respostaDownload = await fetch(urlArquivoAtual);
                if (respostaDownload.ok) {
                    dadosExistentes = await respostaDownload.json();
                }
            }
        } catch (erroLeitura) {
            console.error("Ainda não existem arquivos salvos, criando o primeiro:", erroLeitura);
            dadosExistentes = [];
        }

        // 2. Adicionar a nova resposta recebida do formulário
        dadosExistentes.push(novaResposta);

        // 3. Salvar de volta no Vercel Blob
        // Mudamos 'addRandomSuffix' para true para evitar que o Vercel rejeite o upload por conflito de cache,
        // mas mantemos o 'pathname' fixo para conseguirmos localizá-lo no passo 1.
        await put('respostas.json', JSON.stringify(dadosExistentes, null, 2), {
            access: 'public',
            addRandomSuffix: true,
            token: 'vercel_blob_rw_6QuF4p5ZOwnZtQZb_7XYrFNylPT7nmP3n3Ah1buM6odMD1I'
        });

        return res.status(200).json({ mensagem: 'Resposta guardada com sucesso!' });
    } catch (error) {
        console.error("Erro interno no servidor:", error);
        return res.status(500).json({ erro: 'Erro interno ao salvar os dados no Blob.', detalhe: error.message });
    }
});

// Rota GET para visualizar todas as respostas acumuladas
app.get('/api/ver-respostas', async (req, res) => {
    try {
        const { blobs } = await list({ token: 'vercel_blob_rw_6QuF4p5ZOwnZtQZb_7XYrFNylPT7nmP3n3Ah1buM6odMD1I' });
        const arquivoBlob = blobs.find(b => b.pathname === 'respostas.json');

        if (arquivoBlob) {
            const respostaDownload = await fetch(arquivoBlob.url);
            if (respostaDownload.ok) {
                const dados = await respostaDownload.json();
                return res.status(200).json(dados);
            }
        }
        return res.status(200).json([]);
    } catch (error) {
        return res.status(200).json([]);
    }
});

module.exports = app;


// const express = require('express');
// const cors = require('cors');
// const { kv } = require('@vercel/kv'); // Banco de dados gratuito da Vercel
// const app = express();

// app.use(cors());
// app.use(express.json());

// // Rota GET para ler todas as respostas guardadas
// app.get('/api/ver-respostas', async (req, res) => {
//     try {
//         // Busca a lista na nuvem (se não existir, assume um array vazio)
//         const dados = await kv.get('respostas') || [];
//         return res.status(200).json(dados);
//     } catch (error) {
//         console.error("Erro no KV:", error);
//         return res.status(500).json({ erro: 'Erro ao ler dados do banco.' });
//     }
// });

// // Rota POST para guardar uma nova resposta
// app.post('/api/guardar-resposta', async (req, res) => {
//     try {
//         const novaResposta = req.body;
        
//         if (!novaResposta || Object.keys(novaResposta).length === 0) {
//             return res.status(400).json({ erro: 'Dados vazios.' });
//         }

//         // Pega as respostas atuais que estão guardadas na nuvem
//         let dadosExistentes = await kv.get('respostas') || [];
        
//         // Adiciona a nova
//         dadosExistentes.push(novaResposta);
        
//         // Salva de volta na nuvem
//         await kv.set('respostas', dadosExistentes);

//         return res.status(200).json({ mensagem: 'Resposta adicionada com sucesso!' });
//     } catch (error) {
//         console.error("Erro no KV:", error);
//         return res.status(500).json({ erro: 'Erro ao guardar dados no banco.' });
//     }
// });

// // IMPORTANTE: Para o Express funcionar no Vercel, exportamos o app
// module.exports = app;

// app.listen(3000, () => console.log('Servidor central a correr na porta 3000'));


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
