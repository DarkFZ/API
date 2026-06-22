const express = require('express');
const cors = require('cors');
const { put, list, del } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());

const MEU_TOKEN = 'vercel_blob_rw_Ghdvb6L66M5ZRJRl_A8hiza8weTtD3OHtJEoyKjFOsSufR2';

// ── Helpers Blob ──────────────────────────────────────────────────────────────

async function lerBlob(pathname) {
    try {
        const { blobs } = await list({ token: MEU_TOKEN });
        const blob = blobs.find(b => b.pathname === pathname);
        if (!blob) return null;
        const r = await fetch(blob.url);
        return r.ok ? r.json() : null;
    } catch { return null; }
}

async function gravarBlob(pathname, dados) {
    const { blobs } = await list({ token: MEU_TOKEN });
    const antigo = blobs.find(b => b.pathname === pathname);
    if (antigo) await del(antigo.url, { token: MEU_TOKEN });
    await put(pathname, JSON.stringify(dados, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        token: MEU_TOKEN
    });
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ── CRUD Questionários ────────────────────────────────────────────────────────

app.get('/api/questionarios', async (req, res) => {
    try {
        res.json(await lerBlob('questionarios.json') || []);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/questionarios/:id', async (req, res) => {
    try {
        const lista = await lerBlob('questionarios.json') || [];
        const q = lista.find(q => q.id === req.params.id);
        q ? res.json(q) : res.status(404).json({ erro: 'Questionário não encontrado.' });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/questionarios', async (req, res) => {
    try {
        const { titulo, descricao, nota, perguntas } = req.body;
        if (!titulo || !Array.isArray(perguntas) || !perguntas.length)
            return res.status(400).json({ erro: 'Título e perguntas são obrigatórios.' });
        const lista = await lerBlob('questionarios.json') || [];
        const novo = {
            id: gerarId(), titulo,
            descricao: descricao || '', nota: nota || '',
            criado_em: new Date().toISOString(),
            ativo: true, perguntas
        };
        lista.push(novo);
        await gravarBlob('questionarios.json', lista);
        res.status(201).json(novo);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/questionarios/:id', async (req, res) => {
    try {
        const lista = await lerBlob('questionarios.json') || [];
        const idx = lista.findIndex(q => q.id === req.params.id);
        if (idx === -1) return res.status(404).json({ erro: 'Não encontrado.' });
        lista[idx] = { ...lista[idx], ...req.body, id: lista[idx].id, criado_em: lista[idx].criado_em };
        await gravarBlob('questionarios.json', lista);
        res.json(lista[idx]);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.delete('/api/questionarios/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const lista = await lerBlob('questionarios.json') || [];
        const novos = lista.filter(q => q.id !== id);
        if (novos.length === lista.length) return res.status(404).json({ erro: 'Não encontrado.' });
        await gravarBlob('questionarios.json', novos);

        const respostas = await lerBlob('respostas.json') || [];
        const semRespostas = respostas.filter(r => r.questionario_id !== id);
        const eliminadas = respostas.length - semRespostas.length;
        if (eliminadas > 0) await gravarBlob('respostas.json', semRespostas);

        res.json({ mensagem: 'Questionário apagado com sucesso.', respostas_eliminadas: eliminadas });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Respostas ─────────────────────────────────────────────────────────────────

app.post('/api/guardar-resposta', async (req, res) => {
    try {
        const nova = req.body;
        if (!nova || !Object.keys(nova).length)
            return res.status(400).json({ erro: 'Dados vazios.' });
        const lista = await lerBlob('respostas.json') || [];
        lista.push(nova);
        await gravarBlob('respostas.json', lista);
        res.json({ mensagem: 'Resposta guardada com sucesso!' });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/ver-respostas', async (req, res) => {
    try {
        let dados = await lerBlob('respostas.json') || [];
        const { questionarioId, dataInicio, dataFim } = req.query;
        if (questionarioId)
            dados = dados.filter(r => r.questionario_id === questionarioId);
        if (dataInicio)
            dados = dados.filter(r => new Date(r.Data_Hora_ISO || r.Data_Hora) >= new Date(dataInicio));
        if (dataFim)
            dados = dados.filter(r => new Date(r.Data_Hora_ISO || r.Data_Hora) <= new Date(dataFim + 'T23:59:59'));
        res.json(dados);
    } catch { res.json([]); }
});

// ── Migração Legacy ───────────────────────────────────────────────────────────
// Endpoint idempotente: pode ser chamado várias vezes sem duplicar dados.
// Cria o questionário original no sistema e converte respostas existentes.

app.post('/api/migrar-legacy', async (req, res) => {
    try {
        const LEGACY_ID = 'legacy-gestao-conflitos';

        const questionarioLegacy = {
            id: LEGACY_ID,
            titulo: 'O papel do líder na gestão de conflitos entre os colaboradores',
            descricao: 'O líder tem um papel fundamental na gestão de conflitos entre os colaboradores, garantindo que divergências se transformem em oportunidades de crescimento para manter um ambiente de trabalho saudável e produtivo.',
            nota: 'O presente questionário faz parte de um trabalho académico em Pós-graduação em Psicologia Positiva e tem por objetivo conhecer a opinião dos colaboradores relativamente ao papel do líder na resolução de conflitos e só para esse fim é válido. A sua participação é anónima.',
            criado_em: new Date().toISOString(),
            ativo: true,
            perguntas: [
                { id: 'Idade', tipo: 'radio', texto: 'Idade', obrigatoria: true,
                  opcoes: ['A) 21-30', 'B) 31-40', 'C) 41-50', 'D) 51-60'] },
                { id: 'Sexo', tipo: 'radio', texto: 'Sexo', obrigatoria: true,
                  opcoes: ['A) M', 'B) F'] },
                { id: 'P3_Primeira_Atitude', tipo: 'radio', obrigatoria: true,
                  texto: 'Na sua opinião qual é a primeira atitude que um líder deve tomar diante de um conflito entre colaboradores?',
                  opcoes: ['A) Ignorar o problema para não gerar mais tensão', 'B) Escutar as partes envolvidas de forma imparcial', 'C) Tomar partido de quem parece mais convincente', 'D) Aplicar imediatamente uma punição'] },
                { id: 'P4_Comunicacao', tipo: 'radio', obrigatoria: true,
                  texto: 'Por que a comunicação é essencial na gestão de conflitos?',
                  opcoes: ['A) Porque ajuda a evitar mal-entendidos', 'B) Porque permite impor a decisão do líder', 'C) Porque diminui a necessidade de negociação', 'D) Porque torna os conflitos invisíveis'] },
                { id: 'P5_Pratica_Eficaz', tipo: 'radio', obrigatoria: true,
                  texto: 'Qual das opções representa uma prática eficaz de liderança na resolução de conflitos?',
                  opcoes: ['A) Promover diálogo aberto e respeitoso', 'B) Evitar qualquer envolvimento', 'C) Resolver o conflito sozinho sem consultar os envolvidos', 'D) Adiar indefinidamente a resolução'] },
                { id: 'P6_Intervencao', tipo: 'radio', obrigatoria: true,
                  texto: 'Quando um líder deve intervir em um conflito?',
                  opcoes: ['A) Apenas quando solicitado pelos colaboradores', 'B) Sempre que o conflito ameaça o clima organizacional ou a produtividade', 'C) Nunca, pois os colaboradores devem resolver sozinhos', 'D) Somente quando há impacto financeiro direto'] },
                { id: 'P7_Resultado', tipo: 'radio', obrigatoria: true,
                  texto: 'Qual é o resultado esperado de uma boa gestão de conflitos por parte do líder?',
                  opcoes: ['A) Maior engajamento e cooperação da equipe', 'B) Aumento da competitividade interna', 'C) Redução da comunicação entre os membros', 'D) Neutralização completa das diferenças individuais'] },
                { id: 'P8_Estilos_Trabalho', tipo: 'radio', obrigatoria: true,
                  texto: 'Um líder percebe que dois colaboradores têm estilos de trabalho muito diferentes e frequentemente entram em atrito. Qual deve ser sua abordagem?',
                  opcoes: ['A) Forçar ambos a seguir o mesmo estilo para evitar divergências', 'B) Valorizar as diferenças e buscar complementaridade entre os estilos', 'C) Separar os colaboradores em projetos distintos para evitar contato', 'D) Ignorar, pois diferenças são inevitáveis'] },
                { id: 'P9_Conflito_Reuniao', tipo: 'radio', obrigatoria: true,
                  texto: 'Durante uma reunião, um conflito entre dois membros se intensifica e ameaça o andamento da discussão. O que o líder deve fazer?',
                  opcoes: ['A) Interromper a reunião e marcar outra data', 'B) Permitir que os envolvidos resolvam sozinhos, mesmo que atrapalhe o grupo', 'C) Intervir imediatamente, estabelecer regras de respeito e redirecionar o foco', 'D) Tomar partido de quem está mais alinhado com sua visão'] },
                { id: 'P10_Resistencia_Passiva', tipo: 'radio', obrigatoria: true,
                  texto: 'Um colaborador sente que não foi ouvido em uma decisão e demonstra resistência passiva. Qual é a melhor atitude do líder?',
                  opcoes: ['A) Reforçar a decisão sem abrir espaço para diálogo', 'B) Conversar individualmente para entender a insatisfação e buscar engajamento', 'C) Ignorar a resistência, pois ela não é explícita', 'D) Delegar a outro líder a responsabilidade de lidar com o colaborador'] },
                { id: 'P11_Conflito_Areas', tipo: 'radio', obrigatoria: true,
                  texto: 'Em um conflito entre colaboradores de diferentes áreas, o líder deve…',
                  opcoes: ['A) Promover uma mediação conjunta, garantindo que todos os pontos de vista sejam considerados', 'B) Resolver sozinho, sem consultar os envolvidos, para ganhar tempo', 'C) Priorizar a área mais estratégica para a empresa', 'D) Evitar envolvimento, deixando que os gestores de cada área resolvam'] },
                { id: 'P12_Prevencao_Futura', tipo: 'radio', obrigatoria: true,
                  texto: 'Qual é o papel do líder na prevenção de conflitos futuros?',
                  opcoes: ['A) Criar um ambiente de confiança e comunicação aberta', 'B) Estabelecer regras rígidas para evitar qualquer divergência', 'C) Reduzir a interação entre colaboradores para minimizar atritos', 'D) Não se preocupar, já que conflitos são inevitáveis'] },
                { id: 'P13_Sugestoes', tipo: 'aberta', obrigatoria: false,
                  texto: 'Que ferramentas ou treinamentos poderiam ajudar a equipa a lidar melhor com divergências?',
                  opcoes: [] }
            ]
        };

        // Criar/atualizar questionário na lista
        const lista = await lerBlob('questionarios.json') || [];
        const idx = lista.findIndex(q => q.id === LEGACY_ID);
        idx === -1 ? lista.push(questionarioLegacy) : (lista[idx] = questionarioLegacy);
        await gravarBlob('questionarios.json', lista);

        // Migrar respostas existentes (só as que ainda não têm questionario_id)
        const idadeMap = { '21-30': 'A', '31-40': 'B', '41-50': 'C', '51-60': 'D' };
        const sexoMap  = { 'M': 'A', 'F': 'B' };

        const respostas = await lerBlob('respostas.json') || [];
        let migradas = 0;
        const migradas_lista = respostas.map(r => {
            if (r.questionario_id) return r;
            migradas++;
            return {
                ...r,
                questionario_id: LEGACY_ID,
                Data_Hora_ISO: r.Data_Hora_ISO || new Date().toISOString(),
                Idade: idadeMap[r.Idade] || r.Idade,
                Sexo:  sexoMap[r.Sexo]   || r.Sexo
            };
        });

        if (migradas > 0) await gravarBlob('respostas.json', migradas_lista);

        res.json({
            mensagem: `Migração concluída com sucesso.`,
            questionario_id: LEGACY_ID,
            migradas,
            total: respostas.length
        });
    } catch (e) { res.status(500).json({ erro: e.message }); }
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
