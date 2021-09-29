import express from "express";
import cors from "cors";
import { v4 as uuid, validate } from "uuid";
import fs from "fs";
import { ethers } from "ethers";
import cookieParser from "cookie-parser";

const PORT = 5000;
const app = express();
const walletRe = /^0x[a-fA-F0-9]{40}$/;
const DB_FILE = "./data.json";
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const nonceMiddleware = (req: any, res: any, next: any) => {
  if (!req.cookies.nonce || !req.headers["x-address"])
    return res.status(401).json({ error: "Invalid or expired nonce." });
  const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
  const find = json.accounts.find(
    (i: any) =>
      i.nonce === req.cookies.nonce && i.address === req.headers["x-address"]
  );
  // @TODO validate nonce expiration date

  req.user = find;
  next();
};

app
  .get("/auth/logout", nonceMiddleware, (req, res) => {
    return res.clearCookie("nonce").json({ data: true });
  })
  .post("/auth/signup", (req, res) => {
    const { address } = req.body;
    if (!walletRe.test(address))
      return res.status(400).json({ error: "Invalid wallet address." });
    const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
    const find = json.accounts.find((i: any) => i.address === address);
    const data = {
      id: uuid(),
      address,
      nonce: null,
      issued: null,
    };
    if (!find) {
      json.accounts.push(data);
      fs.writeFileSync(DB_FILE, JSON.stringify(json));
    }
    return res.json({ data: find || data });
  })
  .post("/auth/nonce", (req, res) => {
    const { address } = req.body;
    if (!walletRe.test(address))
      return res.status(400).json({ error: "Invalid wallet address." });
    const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
    const findIndex = json.accounts.findIndex(
      (i: any) => i.address === address
    );
    if (findIndex === -1) return res.status(404).json({ error: "Not found." });
    if (
      !json.accounts[findIndex].issued ||
      (json.accounts[findIndex].issued &&
        new Date(
          new Date().getTime() - json.accounts[findIndex].issued
        ).getMinutes() > 5)
    ) {
      json.accounts[findIndex].issued = new Date();
      json.accounts[findIndex].nonce = uuid();
      fs.writeFileSync(DB_FILE, JSON.stringify(json));
    }
    return res.json({
      data: {
        nonce: json.accounts[findIndex].nonce,
        issued: json.accounts[findIndex].issued,
      },
    });
  })
  .post("/auth/nonce/verify", (req, res) => {
    const { nonce, signed } = req.body;
    if (!validate(nonce))
      return res.status(400).send({ error: "Invalid nonce." });
    if (signed.indexOf("0x") === -1)
      return res.status(400).send({ error: "Invalid signed." });
    const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
    const find = json.accounts.find((i: any) => i.nonce === nonce);
    if (!find)
      return res.status(400).send({ error: "Invalid or expired nonce." });
    const verifyAddress = ethers.utils.verifyMessage(
      `Login\n\n${nonce}`,
      signed
    );
    if (find.address !== verifyAddress)
      return res.status(401).send({ error: "Invalid address signed." });

    const expires = new Date(find.issued);
    expires.setMinutes(expires.getMinutes() + 200); // Adjust 200 later

    return res
      .cookie("nonce", `${find.nonce}`, {
        httpOnly: true,
        expires,
      })
      .json({ data: verifyAddress });
  })
  .post("/auth/verify", (req, res) => {
    const address = `${req.headers["x-address"]}`;
    if (!walletRe.test(address))
      return res.status(400).json({ error: "Invalid wallet address." });
    const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
    const find = json.accounts.find((i: any) => i.address === address);
    // @TODO
    // if nonce present
    // & if still active nonce, refresh nonce cookie
    if (!find) return res.status(404).json({ error: "Not found." });
    return res.json({ data: find.address });
  })
  .get("/messages", nonceMiddleware, (req, res) => {
    console.log(req.cookies);
    const user = (req as any).user;
    console.log({ user });
    const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
    const find = json.messages.filter((i: any) => i.ownerId === user.id);

    return res.json({ data: find });
  })
  .get("/messages/nonce", nonceMiddleware, (req, res) => {
    // console.log(req.cookies);
    // const user = (req as any).user;
    let u = null;
    try {
      u = uuid();
      const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
      const data = {
        id: null,
        ownerId: null,
        message: null,
        nonce: u,
      };
      json.messages.push(data);
      fs.writeFileSync(DB_FILE, JSON.stringify(json));
    } catch (error) {
      console.log({ error });
    }
    // const find = json.messages.filter((i: any) => i.ownerId === user.id);

    return res.json({ data: u });
  })
  .post("/messages", nonceMiddleware, (req, res) => {
    const user = (req as any).user;
    const address = req.headers["x-address"];
    const { message, nonce, signed } = req.body;
    console.log({ message });
    console.log({ nonce });
    console.log({ signed });
    const json = JSON.parse(fs.readFileSync(DB_FILE).toString());
    const find = json.messages.findIndex(
      (i: any) => i.nonce === nonce && i.ownerId === null && i.message === null
    );
    if (find === -1) return res.status(400).json({ error: "Invalid nonce." });

    const verifyAddress = ethers.utils.verifyMessage(
      `${message}\n\n${nonce}`,
      signed
    );

    console.log({ verifyAddress });

    if (address !== verifyAddress)
      return res.status(401).send({ error: "Invalid address signed." });

    json.messages[find] = {
      id: uuid(),
      ownerId: user.id,
      message,
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(json));

    return res.json({ data: json.messages[find] });
  });

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
