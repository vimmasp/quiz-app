const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let salas = {};

const preguntas = [
  {
    pregunta: "¿Capital de México?",
    opciones: ["CDMX","Guadalajara","Monterrey","Puebla"],
    correcta: 0
  },
  {
    pregunta: "¿5 x 2?",
    opciones: ["10","8","6","12"],
    correcta: 0
  },
  {
    pregunta: "¿Color del cielo?",
    opciones: ["Rojo","Azul","Verde","Amarillo"],
    correcta: 1
  }
];

function generarPIN(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Crear partida
app.get("/create", (req,res)=>{
  const pin = generarPIN();
  salas[pin] = { jugadores: [], preguntaActual: null };
  res.json({pin});
});

// Obtener pregunta
app.get("/question", (req,res)=>{
  const q = preguntas[Math.floor(Math.random()*preguntas.length)];
  res.json(q);
});

// SOCKETS
io.on("connection", socket => {

  socket.on("join", ({pin,nombre})=>{
    socket.join(pin);

    if(!salas[pin]) return;

    salas[pin].jugadores.push({
      id: socket.id,
      nombre,
      puntos: 0
    });

    io.to(pin).emit("players", salas[pin].jugadores);
  });

  socket.on("startQuestion", ({pin, pregunta, tiempo})=>{
    if(!salas[pin]) return;

    salas[pin].preguntaActual = pregunta;

    io.to(pin).emit("question", pregunta);

    let t = tiempo;

    const timer = setInterval(()=>{
      t--;
      io.to(pin).emit("timer", t);

      if(t <= 0){
        clearInterval(timer);
        io.to(pin).emit("showRanking", salas[pin].jugadores.sort((a,b)=>b.puntos-a.puntos));
      }

    },1000);
  });

  socket.on("answer", ({pin, respuesta})=>{
    const sala = salas[pin];
    if(!sala) return;

    const jugador = sala.jugadores.find(j=>j.id === socket.id);

    if(jugador && respuesta === sala.preguntaActual.correcta){
      jugador.puntos += 100;
    }
  });

});

server.listen(process.env.PORT || 3000, ()=> console.log("Servidor listo"));
