const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let salas = {};

let preguntas = [
  {
    pregunta: "¿Capital de México?",
    opciones: ["CDMX","Guadalajara","Monterrey","Puebla"],
    correcta: 0
  },
  {
    pregunta: "¿2+2?",
    opciones: ["3","4","5","6"],
    correcta: 1
  }
];

// 🔹 Generar PIN
function generarPIN(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🔹 Crear partida
app.get("/create", (req,res)=>{
  const pin = generarPIN();
  salas[pin] = [];
  res.json({pin});
});

// 🔹 Obtener pregunta
app.get("/question", (req,res)=>{
  const q = preguntas[Math.floor(Math.random()*preguntas.length)];
  res.json(q);
});

// 🔌 SOCKETS
io.on("connection", (socket)=>{

  console.log("Usuario conectado");

  socket.on("joinGame", ({pin,nombre})=>{
    socket.join(pin);

    if(!salas[pin]) salas[pin]=[];

    salas[pin].push({
      id: socket.id,
      nombre,
      puntos: 0
    });

    io.to(pin).emit("players", salas[pin]);
  });

  socket.on("startQuestion", ({pin, pregunta, tiempo})=>{
    io.to(pin).emit("question", pregunta);

    let t = tiempo;

    const interval = setInterval(()=>{
      t--;
      io.to(pin).emit("timer", t);

      if(t <= 0){
        clearInterval(interval);
        io.to(pin).emit("end");
      }

    },1000);
  });

  socket.on("answer", ({pin, respuesta, correcta})=>{
    let player = salas[pin].find(p=>p.id===socket.id);

    if(player && respuesta === correcta){
      player.puntos += 100;
    }

    io.to(pin).emit("players", salas[pin]);
  });

  socket.on("ranking", (pin)=>{
    let ranking = salas[pin].sort((a,b)=>b.puntos-a.puntos);
    io.to(pin).emit("ranking", ranking);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=>{
  console.log("Servidor corriendo en puerto " + PORT);
});