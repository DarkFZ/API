// server.js
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const path = require('path');

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Servir também arquivos da pasta raiz (para o index.html)
app.use(express.static(__dirname));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Rota para servir a página de boas-vindas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); 
});

// ... resto do seu código

// Buscar estado do LED
app.get('/api/led', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/led_state?id=eq.1`, {
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Erro ao buscar dados do Supabase');

    const data = await response.json();
    if (data.length > 0) {
      res.json({ isOn: data[0].state, online: data[0].online || false });
    } else {
      res.status(404).json({ message: 'Estado do LED não encontrado.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar estado do LED
app.patch('/api/led', async (req, res) => {
  const { isOn, online } = req.body;
  if (typeof isOn !== 'boolean' || typeof online !== 'boolean') {
    return res.status(400).json({ error: 'Os campos "isOn" e "online" devem ser booleanos.' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/led_state?id=eq.1`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: isOn, online: online }),
    });

    if (!response.ok) throw new Error('Erro ao atualizar o estado do LED no Supabase');

    res.json({ message: `LED ${isOn ? 'ligado' : 'desligado'}, online: ${online}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
