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

// 🔹 Generar PIN
function generarPIN(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🔹 Crear partida
app.get("/create", (req,res)=>{
  const pin = generarPIN();

  salas[pin] = {
    jugadores: [],
    preguntas: [],
    index: 0,
    preguntaActual: null, // 🔥 CLAVE
    conteo: [0,0,0,0]
  };

  res.json({pin});
});

// 🔌 SOCKETS
io.on("connection", socket => {

  // 👥 UNIR
  socket.on("join", ({pin,nombre})=>{
    if(!salas[pin]) return;

    socket.join(pin);

    salas[pin].jugadores.push({
      id: socket.id,
      nombre,
      puntos: 0,
      respondio: false
    });

    io.to(pin).emit("players", salas[pin].jugadores);
  });

  // 📝 AGREGAR PREGUNTA
  socket.on("addQuestion", ({pin, pregunta})=>{
    if(!salas[pin]) return;

    salas[pin].preguntas.push(pregunta);
  });

  // 🚀 INICIAR
  socket.on("startGame", ({pin})=>{
    if(!salas[pin]) return;

    salas[pin].index = 0;
    enviarPregunta(pin);
  });

  // 🔁 ENVIAR PREGUNTA
  function enviarPregunta(pin){

    const sala = salas[pin];
    if(!sala) return;

    if(sala.index >= sala.preguntas.length){

      const ranking = sala.jugadores.sort((a,b)=>b.puntos-a.puntos);

      io.to(pin).emit("ranking", ranking);
      return;
    }

    const pregunta = sala.preguntas[sala.index];

    // 🔥 GUARDAR PREGUNTA ACTUAL
    sala.preguntaActual = pregunta;

    // reset
    sala.jugadores.forEach(j => j.respondio = false);
    sala.conteo = [0,0,0,0];

    io.to(pin).emit("question", pregunta);

    let t = 10;

    const timer = setInterval(()=>{
      t--;
      io.to(pin).emit("timer", t);

      if(t <= 0){
        clearInterval(timer);

        sala.index++;

        setTimeout(()=> enviarPregunta(pin), 2000);
      }

    },1000);
  }

  // ✅ RESPUESTA
  socket.on("answer", ({pin, respuesta})=>{
    const sala = salas[pin];
    if(!sala) return;

    const jugador = sala.jugadores.find(j=>j.id === socket.id);

    const pregunta = sala.preguntaActual; // 🔥 USAR ESTA

    if(jugador && !jugador.respondio && pregunta){

      jugador.respondio = true;

      // 📊 stats
      sala.conteo[respuesta]++;

      io.to(pin).emit("stats", {
        conteo: sala.conteo
      });

      // 🏆 puntos
      if(respuesta === pregunta.correcta){
        jugador.puntos += 100;
        console.log("✅ SUMA:", jugador.nombre);
      }else{
        console.log("❌ FALLÓ:", jugador.nombre);
      }

    }
  });

});

server.listen(process.env.PORT || 3000, ()=> 
  console.log("Servidor listo")
);
