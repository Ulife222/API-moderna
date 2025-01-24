const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

let items = [];

app.post('/items', (req, res) => {
  const item = req.body;
  items.push(item);
  res.status(201).send(item);
});

app.get('/items', (req, res) => {
  res.send(items);
});

app.get('/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = items.find(i => i.id === id);
  if (item) {
    res.send(item);
  } else {
    res.status(404).send({ message: 'Item não encontrado' });
  }
});

app.put('/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    items[index] = req.body;
    res.send(items[index]);
  } else {
    res.status(404).send({ message: 'Item não encontrado' });
  }
});

app.delete('/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    const deletedItem = items.splice(index, 1);
    res.send(deletedItem);
  } else {
    res.status(404).send({ message: 'Item não encontrado' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
