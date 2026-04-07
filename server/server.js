const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let salas = {};

function generarPIN(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Crear partida
app.get("/create", (req,res)=>{
  const pin = generarPIN();
  salas[pin] = {
    jugadores: [],
    preguntaActual: null
  };
  res.json({pin});
});

// SOCKETS
io.on("connection", socket => {

  socket.on("join", ({pin,nombre})=>{
    if(!salas[pin]) return;

    socket.join(pin);

    salas[pin].jugadores.push({
      id: socket.id,
      nombre,
      puntos: 0
    });

    io.to(pin).emit("players", salas[pin].jugadores);
  });

  socket.on("startQuestion", ({pin, pregunta, tiempo})=>{
    const sala = salas[pin];
    if(!sala) return;

    sala.preguntaActual = pregunta;

    io.to(pin).emit("question", pregunta);

    let t = tiempo;

    const timer = setInterval(()=>{
      t--;
      io.to(pin).emit("timer", t);

      if(t <= 0){
        clearInterval(timer);

        const ranking = sala.jugadores.sort((a,b)=>b.puntos-a.puntos);

        io.to(pin).emit("ranking", ranking);
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
