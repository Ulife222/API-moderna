import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import Record from "./models/Record.js";
import beneficiariosRouter from "./routes/beneficiarios.js";
import Beneficiario from "./models/Beneficiario.js";
import Counter from "./models/Counter.js";
import os from "os"; // Importação para obter o endereço MAC

const app = express();

// Middlewares
const allowedOrigins = [
  'https://nexustecnologia.modernaedificacoes.com.br',
  // Adicione outras origens permitidas aqui
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(bodyParser.json());
app.use(express.json());

// Conexão ao MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI, // Use a variável de ambiente para a URI do MongoDB
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Conectado ao MongoDB"))
  .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));

// Adicionar um beneficiário de exemplo ao banco de dados
app.post("/api/beneficiarios/exemplo", async (req, res) => {
  try {
    console.log("Rota POST /api/beneficiarios/exemplo chamada"); // Log para depuração
    const exemploBeneficiario = new Beneficiario({ name: "Beneficiário Exemplo" });
    const savedBeneficiario = await exemploBeneficiario.save();
    res.status(201).json(savedBeneficiario);
  } catch (error) {
    console.error("Erro ao adicionar beneficiário de exemplo:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um registro
app.post("/records", async (req, res) => {
  try {
    console.log("Rota POST /records chamada"); // Log para depuração
    console.log("Dados recebidos:", req.body); // Adicione este log para depuração
    const { beneficiario, fornecedor, date, services, totalValue } = req.body;

    // Verifique se todos os campos necessários estão presentes
    if (!beneficiario || !fornecedor || !date || !services || !totalValue) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    const record = new Record({
      ...req.body,
      status: req.body.status || 'pendente' // Adicionar o campo status
    });
    const savedRecord = await record.save();
    res.status(201).json({ _id: savedRecord._id }); // Retornar o _id gerado
  } catch (error) {
    console.error("Erro ao salvar o registro:", error); // Adicione este log para depuração
    res.status(400).json({ message: error.message });
  }
});

// Rota para listar todos os registros
app.get("/records", async (req, res) => {
  try {
    console.log("Rota GET /records chamada"); // Log para depuração
    const records = await Record.find();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um registro específico
app.get("/records/:id", async (req, res) => {
  try {
    console.log(`Rota GET /records/${req.params.id} chamada`); // Log para depuração
    const { id } = req.params;
    const record = await Record.findById(id); // Buscar pelo campo _id
    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    res.json(record);
  } catch (error) {
    console.error("Erro ao buscar o registro:", error); // Adicionar log para depuração
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um registro com assinatura
app.put("/records/:id", async (req, res) => {
  try {
    console.log(`Rota PUT /records/${req.params.id} chamada`); // Log para depuração
    const { id } = req.params;
    const { signature, signatureURL, status } = req.body;
    const record = await Record.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (record.signature) {
      return res.status(400).json({ message: "Este recibo já foi assinado." });
    }
    record.signature = signature;
    record.signatureURL = signatureURL;
    record.status = status || record.status;
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    console.error("Erro ao atualizar o registro:", error);
    res.status(500).json({ message: error.message });
  }
});

const getMACAddress = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.mac && net.mac !== '00:00:00:00:00:00') {
        console.log("Endereço MAC obtido:", net.mac); // Log para exibir o endereço MAC no console
        return net.mac;
      }
    }
  }
  return null;
};

// Rota para obter o endereço MAC
app.get("/mac-address", (req, res) => {
  const macAddress = getMACAddress();
  res.json({ macAddress });
});

// Rota para atualizar a localização de um registro
app.put("/records/:id/location", async (req, res) => {
  try {
    console.log(`Rota PUT /records/${req.params.id}/location chamada`); // Log para depuração
    const { id } = req.params;
    const { location, locationDetails, ipAddress, macAddress } = req.body; // Adicione macAddress ao corpo da requisição
    console.log("Atualizando localização para o registro:", id); // Log para depuração
    console.log("Nova localização:", location); // Log para depuração
    console.log("Detalhes da localização:", locationDetails); // Log para depuração
    console.log("Endereço IP:", ipAddress); // Log para depuração
    console.log("Endereço MAC:", macAddress); // Log para depuração

    // Verifique se os dados de localização estão presentes
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ message: "Dados de localização inválidos" });
    }

    const updatedRecord = await Record.findByIdAndUpdate(id, { location, locationDetails, ipAddress, macAddress }, { new: true }); // Adicione macAddress
    if (!updatedRecord) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    res.json(updatedRecord);
  } catch (error) {
    console.error("Erro ao atualizar a localização do registro:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar registros por localização
app.get("/records/location/:location", async (req, res) => {
  try {
    console.log(`Rota GET /records/location/${req.params.location} chamada`); // Log para depuração
    const { location } = req.params;
    const records = await Record.find({ location });
    if (records.length === 0) {
      return res.status(404).json({ message: "Nenhum registro encontrado para esta localização" });
    }
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar registros por localização:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um registro
app.delete("/records/:id", async (req, res) => {
  try {
    console.log(`Rota DELETE /records/${req.params.id} chamada`); // Log para depuração
    const { id } = req.params;
    const deletedRecord = await Record.findByIdAndDelete(id); // Excluir pelo campo _id
    if (!deletedRecord) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    res.status(200).json({ message: "Registro excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir o registro:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir todos os registros
app.delete("/records", async (req, res) => {
  try {
    console.log("Rota DELETE /records chamada"); // Log para depuração
    await Record.deleteMany({});
    res
      .status(200)
      .json({ message: "Todos os registros foram excluídos com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir todos os registros:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir todos os beneficiários
app.delete("/beneficiarios", async (req, res) => {
  try {
    console.log("Rota DELETE /beneficiarios chamada"); // Log para depuração
    await Beneficiario.deleteMany({});
    res
      .status(200)
      .json({ message: "Todos os beneficiários foram excluídos com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir todos os beneficiários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os beneficiários
app.get("/api/beneficiarios", async (req, res) => {
  try {
    console.log("Rota GET /api/beneficiarios chamada"); // Log para depuração
    const beneficiarios = await Beneficiario.find();
    console.log("Beneficiários encontrados:", beneficiarios); // Adicionar log para depuração
    res.json(beneficiarios);
  } catch (error) {
    console.error("Erro ao buscar beneficiários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar recibos recusados
app.get("/records/recusados", async (req, res) => {
  try {
    console.log("Rota GET /records/recusados chamada"); // Log para depuração
    const records = await Record.find({ status: 'recusado' });
    console.log("Recibos recusados encontrados:", records); // Log para depuração
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos recusados:", error); // Log para depuração
    res.status(500).json({ message: "Erro ao buscar recibos recusados", error: error.message });
  }
});

// Rota para listar recibos pendentes
app.get("/records/pendentes", async (req, res) => {
  try {
    console.log("Rota GET /records/pendentes chamada"); // Log para depuração
    const records = await Record.find({ status: 'pendente' });
    console.log("Recibos pendentes encontrados:", records); // Log para depuração
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos pendentes:", error); // Log para depuração
    res.status(500).json({ message: "Erro ao buscar recibos pendentes", error: error.message });
  }
});

// Rota para listar recibos aprovados
app.get("/records/aprovados", async (req, res) => {
  try {
    console.log("Rota GET /records/aprovados chamada"); // Log para depuração
    const records = await Record.find({ status: 'aprovado' });
    console.log("Recibos aprovados encontrados:", records); // Log para depuração
    res.json(records);
  } catch (error) {
    console.error("Erro ao buscar recibos aprovados:", error); // Log para depuração
    res.status(500).json({ message: "Erro ao buscar recibos aprovados", error: error.message });
  }
});

// Rota para obter o próximo ID disponível
app.get("/records/nextId", async (req, res) => {
  try {
    console.log("Rota GET /records/nextId chamada"); // Log para depuração
    const counter = await Counter.findById("recordId");
    const nextId = counter ? counter.seq + 1 : 1;
    res.json({ nextId });
  } catch (error) {
    console.error("Erro ao obter o próximo ID:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter o IP do banco de dados
app.get("/db/ip", (req, res) => {
  const dbUri = mongoose.connection.host;
  res.json({ dbIp: dbUri });
});

// Middleware para lidar com erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.use("/api/beneficiarios", beneficiariosRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
