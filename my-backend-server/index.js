const WebSocketServer = require("ws").Server;


const wss = new WebSocketServer({ port: 8080 });


const uuid = require("uuid");
const connections = new Map();


let currentBets = [];
const currentBettors = new Set();


wss.on("connection", (ws, request, client) => {
  console.log("Incoming connection...");


  ws.clientId = uuid.v4();


  connections.set(ws, {
    clientId: ws.clientId,
    coins: 100,
  });


  ws.send(
    JSON.stringify({
      event: "INIT",
      ...connections.get(ws),
    })
  );


  ws.on("message", (data, request, client) => {
    console.log(`received message ${data} from user ${ws.clientId}`);
    const decodedMessage = JSON.parse(data);


    if (
      currentBettors.has(ws.clientId) ||
      !connections.get(ws) ||
      connections.get(ws).coins < decodedMessage.betAmount
    )
      return false;


    connections.get(ws).coins -= decodedMessage.betAmount;


    ws.send(JSON.stringify({
      event: "SUBTRACT_COINS",
      totalCoins: connections.get(ws).coins
    }));


    currentBets.push({
      clientId: ws.clientId,
      betAmount: decodedMessage.betAmount,
      color: decodedMessage.color,
    });


    currentBettors.add(ws.clientId);
  });
});


setInterval(() => {
  const computed_random_num = Math.floor(Math.random() * 25);


  const winning_color = getRollColor(computed_random_num);
  console.log("Winning color for the round: " + winning_color);


  wss.clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      if (currentBets && currentBettors.has(ws.clientId)) {
        const currentBet = currentBets.find((bet) => bet.clientId === ws.clientId);
        const isWinningBet = currentBet.color === winning_color;
        const winningAmount = winning_color === "GREEN" ? currentBet.betAmount * 24 : currentBet.betAmount * 2;
        if (isWinningBet) {
          connections.get(ws).coins += winningAmount;
          ws.send(
            JSON.stringify({
              event: "WIN",
              totalCoins: connections.get(ws).coins,
            })
          );
        }
      }


      ws.send(JSON.stringify({
        event: "BROADCAST_ROLL",
        number: computed_random_num
      }));
    }
  });


  currentBets = [];
  currentBettors.clear();
}, 15000);


const getRollColor = (number) => {
  const redNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const blackNumbers = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

  if (number === 0) {
    return "GREEN";
  } else if (redNumbers.includes(number)) {
    return "RED";
  } else if (blackNumbers.includes(number)) {
    return "BLACK";
  } else {
    throw new Error("Invalid number");
  }
};


