export default async function transactionDataSSE(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    clients.push(res);

    res.on("close", () => {
      clients = clients.filter((client) => client !== res);
    });
  } catch (error) {
    console.log(error);
  }
}