import express from "express";
import bodyParser from "body-parser";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import session from "express-session";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

const db = new pg.Client({
    user: "postgres",
    password: "Dominoz@data123",
    database: "UravuLabs",
    host: "localhost",
    port:  5432,
});

db.connect();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(express.static(__dirname + "/public"));
//app.use(express.static(__dirname + "/views"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/admin", (req, res) => {
    res.render("admin.ejs")
});

app.post('/placeorder', async (req, res) => {
    const username = req.body.user_name;
    const password = req.body.pass_word;
    try {
        const result = await db.query("SELECT * FROM customer_info WHERE username = $1", [username]);
        if (result.rows.length > 0) {
            const model = [];
            const result_model = result.rows[0].volume;
            model.push(result_model);
            const stored_password = result.rows[0].password;
            if (stored_password === password) {
                req.session.username = username;
                res.render("index.ejs", { newdata: username, models: model });
                console.log(`${username} has logged in the portal`);
            } else {    
                res.redirect("/");
                console.log("Password is wrong");
            }
        } else {
            console.log("User does not exist");
            res.redirect("/");
        }
    } catch (err) {
        console.log("The error is at:" + err)
    }
});

app.post("/submit", async (req, res) => {
    if (!req.session.username) {
        res.redirect("/");
        return;
    }
    const new_order = req.body;
    const o_username = req.session.username;
    const o_bottlemodel = new_order.bottleModel;
    const o_orderdate = new_order.order_date;
    const o_deliverydate = new_order.delivery_date;
    const o_deliverytimE = new_order.delivery_timE;
    const o_quantity = new_order.quant_ity;
    const o_status = "Ordered";
    const o_payment = "Pending";
    const get_price = await db.query(`SELECT price_${o_bottlemodel} FROM customer_info WHERE username=$1`,[o_username]);
    console.log(get_price.rows[0].ml);
    const price = get_price.rows[0].ml;
    const total_amount = o_quantity * 1.18 * price;
    console.log(total_amount);
    console.log(new_order);
    db.query("INSERT INTO order_info (username, volume, order_date, delivery_date, time, quantity, status, total_invoice_value, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [o_username, o_bottlemodel, o_orderdate, o_deliverydate, o_deliverytimE, o_quantity, o_status, total_amount, o_payment]);
});

app.post("/add", (req, res) => {
    const new_response = req.body;
    const n_username = new_response.new_username;
    const n_password = new_response.new_password;
    const n_volume = new_response.new_volume1;
    const n_branch = new_response.new_branch;
    db.query("INSERT INTO customer_info (username, password, volume, branch) VALUES ($1, $2, $3, $4)", [n_username, n_password, n_volume, n_branch]);
}); 

app.post('/update-order-status', (req, res) => {
    const { slno, status } = req.body;

    db.query('UPDATE order_info SET status = $1 WHERE id = $2', [status, slno])
        .then(() => {
            res.sendStatus(200);
        })
        .catch(error => {
            console.error('Error updating order status:', error);
            res.sendStatus(500);
        });
});

app.post('/update-payment-status', (req, res) => {
    const { slno, status } = req.body;

    db.query('UPDATE order_info SET payment_status = $1 WHERE id = $2', [status, slno])
        .then(() => {
            res.sendStatus(200);
        })
        .catch(error => {
            console.error('Error updating order status:', error);
            res.sendStatus(500);
        });
});

app.get("/allorders", async (req, res) => {
    if (!req.session.username) {
        res.redirect("/");
        return;
    }
    const username = req.session.username;
    const fetch_data = await db.query("SELECT * FROM order_info WHERE username=$1", [username]);
    const all_invoice = await db.query("SELECT total_invoice_value FROM order_info WHERE username=$1 AND payment_status='pending'", [username]);
    let final_value = 0;
    all_invoice.rows.forEach(invoice=>{
        if(invoice.total_invoice_value==="null")
        {
            final_value += 0;

        }
        else{
            final_value += invoice.total_invoice_value;
        }
    });
    res.render('allorders.ejs', { display_data: fetch_data.rows, inv_total: final_value });
});

app.listen(`${port}`, () => {
    console.log(`Server is running on port: ${port}`)
});
