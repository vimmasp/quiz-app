let usuarios = [];

app.post("/login", (req,res)=>{
  const {user, pass} = req.body;

  if(user === "admin" && pass === "1234"){
    return res.json({ok:true});
  }

  res.json({ok:false});
});
