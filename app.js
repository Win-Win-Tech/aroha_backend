const express = require("express");
const mysql = require("mysql");
const axios = require("axios");
const app = express();
const cors = require("cors");
const PORT =3002;
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const uuid = require("uuid").v4;
const path = require("path");
const moment = require("moment-timezone");
const { time } = require("console");


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

moment.tz.setDefault("Asia/Kolkata");

// const db = mysql.createPool({
//   host: "ls-539ff9288c31c17345c0a657feb9d3416f37581e.c3oi2ow4g0b0.ap-south-1.rds.amazonaws.com",
//   user: "dbmasteruser",
//   password: "alagar1224",
//   database: "AlagarClinic_Madurai",
//     timezone: '+05:30', 
// });

// const db = mysql.createPool({
//   host: "147.93.27.224",
//   user: "root",
//   password: "Dob@29061983",
//   database: "Alagar_Clinic",
//     timezone: '+05:30', 
// });

const db = mysql.createPool({
  host: "193.203.184.6",
  user: "u547203012_aroha_usr",
  password: "Yayaya@143",
  database: "u547203012_aroha_db",
    timezone: '+05:30', 
});


const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS User_Inventory (
    user_id  VARCHAR(36) PRIMARY KEY,
    user_first_name VARCHAR(255),
    user_last_name VARCHAR(255),
    user_email VARCHAR(255) UNIQUE,
    user_mobile_number VARCHAR(20),
    user_role VARCHAR(20),
    user_password VARCHAR(255),
    user_token VARCHAR(255),
    user_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP )
`;

const createEventHistoryTableQuery = `
CREATE TABLE IF NOT EXISTS Event_History (
  event_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_first_name VARCHAR(255),
  user_last_name VARCHAR(255),
  user_role VARCHAR(20),
  event_type ENUM('login', 'logout') NOT NULL,
  event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`;

const createPurchaseTableQuery = `
  CREATE TABLE IF NOT EXISTS Purchase_Inventory (
    id INT NOT NULL AUTO_INCREMENT,
    medicinename VARCHAR(20),
    brandname VARCHAR(20),
    otherdetails VARCHAR(100),
    dosage VARCHAR(50),
    purchaseprice DECIMAL(10,2),  
    totalqty INT,
    purchaseamount DECIMAL(10,2),
    expirydate DATE,
    mrp DECIMAL(10,2),
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, medicinename, dosage),
    INDEX (medicinename, dosage)
  )
`;

const createStockTableQuery = `
  CREATE TABLE IF NOT EXISTS Stock_Inventory (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    medicinename VARCHAR(20), 
    brandname VARCHAR(20), 
    dosage VARCHAR(50),
    purchaseprice DECIMAL(10,2),
    totalqty INT,
    purchaseamount DECIMAL(10,2),
    mrp DECIMAL(10,2),
    purchasedate DATE,
    expirydate DATE,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicinename, dosage) REFERENCES Purchase_Inventory(medicinename, dosage)
  )
`;

const createBillingTableQuery = `
CREATE TABLE IF NOT EXISTS Billing_Inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tabletdetails JSON, 
  subtotal DECIMAL(10,2),  
  discount DECIMAL(10,2),
  grandtotal DECIMAL(10,2),
  patientname VARCHAR(255),
  doctorname VARCHAR(255),
  mobileno VARCHAR(20),
  cashgiven DECIMAL(10,2),
  balance DECIMAL(10,2),
  invoice_number VARCHAR(20),
  createdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

const privateKey =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCKYCCU+icNr+dlESZOSomuTvi7Sv5HXbV2+RGzNWNGhnQYLGSPYFh3NRZ7HuP3C1M+sI2vX1UGb/AXlucw+pDLQpungBOyyi9zwsyzgBvdeZRFNj3V9tn3CQaEPTXbBFwSszmpPZvdk58L/YCru3G2XPdFNpKnv0Q7yiiiMWIX0wIDAQAB";

app.post("/register", async (req, res) => {
  try {
    const reqData = req.body;

    if (!reqData || Object.keys(reqData).length === 0) {
      throw new Error("Please provide data.");
    }

    const existingEmailQuery =
      "SELECT COUNT(*) as count FROM User_Inventory WHERE user_email = ?";
    db.query(existingEmailQuery, [reqData.user_email], async (error, results) => {
      if (error) {
        throw new Error("Database error: " + error.message);
      }
      if (results[0].count > 0) {
        return res.status(400).json({
          status: 400,
          message: "Email already exists.",
          error: true,
        });
      }

      const enpPassword = await bcrypt.hash(reqData.user_password, 10);
      const token = jwt.sign(reqData, privateKey);
      const user = "userid-" + uuid();

      const istTimestamp = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

      const insertUserQuery = `
          INSERT INTO User_Inventory (user_id, user_first_name, user_last_name, user_email, user_mobile_number, user_role, user_password, user_token, user_timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      const values = [
        user,
        reqData.user_first_name,
        reqData.user_last_name,
        reqData.user_email,
        reqData.user_mobile_number,
        reqData.user_role,
        enpPassword,
        token,
        istTimestamp
      ];

      db.query(insertUserQuery, values, (error, result) => {
        if (error) {
          throw new Error("Error inserting user: " + error.message);
        }

        res.status(200).json({
          status: 200,
          data: result,
          message: "User added successfully",
          error: false,
        });
      });
    });

  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ status: 500, message: "Internal server error.", error: true });
  }
});

app.get("/check-email", async (req, res) => {
  try {
    const userEmail = req.query.email;

    const existingEmailQuery =
      "SELECT COUNT(*) as count FROM User_Inventory WHERE user_email = ?";

    db.query(existingEmailQuery, [userEmail], (error, results) => {
      if (error) {
        return res.status(500).json({ status: 500, message: "Database error", error: true });
      }

      if (results[0].count > 0) {
        // Email exists
        return res.status(200).json({ status: 400, message: "Email already exists", error: true });
      } else {
        // Email does not exist
        return res.status(200).json({ status: 200, message: "Email available", error: false });
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: error.message, error: true });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body;

    const getUserQuery = `
    SELECT * FROM User_Inventory 
    WHERE (CONCAT(user_first_name, user_last_name) = ? OR user_email = ? OR user_mobile_number = ?)
    
      `;

    db.query(getUserQuery, [loginIdentifier, loginIdentifier, loginIdentifier], async (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid username" });
      }

      const user = results[0];
      const passwordMatch = await bcrypt.compare(password, user.user_password);

      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      if (results.length === 0 && !passwordMatch) {
        return res
          .status(401)
          .json({ message: "Invalid username and password" });
      }

      const token = jwt.sign({ user_id: user.user_id }, privateKey);

      const insertLoginEventQuery = `
  INSERT INTO Event_History (user_first_name, user_last_name, user_role, event_type, event_timestamp)
  VALUES (?, ?, ?, 'login', CONVERT_TZ(CURRENT_TIMESTAMP, 'UTC', 'Asia/Kolkata')
  )
`;


      const loginEventValues = [user.user_first_name, user.user_last_name, user.user_role];
      db.query(insertLoginEventQuery, loginEventValues, (error, result) => {
        if (error) {
          console.error("Error inserting login event: " + error.message);
        }
      });

      res.status(200).json({
        status: 200,
        data: { token, user },
        message: "Login successful",
        error: false,
      });
    });
  } catch (error) {
    res.status(400).json({ status: 400, message: error.message, error: true });
  }
});

app.post("/logout", async (req, res) => {
  try {
    const { userId } = req.body;

    const getUserQuery = `
        SELECT user_first_name, user_last_name, user_role
        FROM User_Inventory
        WHERE user_id = ?
      `;

    db.query(getUserQuery, [userId], async (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = results[0];

      const insertLogoutEventQuery = `
  INSERT INTO Event_History (user_first_name, user_last_name, user_role, event_type, event_timestamp)
  VALUES (?, ?, ?, 'logout', CONVERT_TZ(CURRENT_TIMESTAMP, 'UTC', 'Asia/Kolkata'))
`;



      const logoutEventValues = [user.user_first_name, user.user_last_name, user.user_role];

      db.query(insertLogoutEventQuery, logoutEventValues, (error, result) => {
        if (error) {
          console.error("Error inserting logout event: " + error.message);
        }
      });

      res.status(200).json({
        status: 200,
        message: "Logout successful",
        error: false,
      });
    });
  } catch (error) {
    res.status(400).json({ status: 400, message: error.message, error: true });
  }
});


app.get("/event-history", (req, res) => {
  const getEventHistoryQuery = `
      SELECT * FROM Event_History
      ORDER BY event_timestamp DESC;
    `;

  db.query(getEventHistoryQuery, (error, results) => {
    if (error) {
      return res.status(500).json({ message: "Database error", error: true });
    }

    res.status(200).json({
      status: 200,
      data: results,
      message: "Event history retrieved successfully",
      error: false,
    });
  });
});


app.use((req, res, next) => {

  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

db.getConnection((connectionError, connection) => {
  if (connectionError) {
    console.error("Database connection failed: " + connectionError.stack);
    return;
  }

  connection.query(createUsersTableQuery, (error, result) => {
    if (error) {
      throw new Error("Error creating User_Inventory table: " + error.message);
    }
    console.log("User_Inventory table created successfully");
  });

  connection.query(createEventHistoryTableQuery, (error, result) => {
    if (error) {
      throw new Error("Error creating Event_History table: " + error.message);
    }
    console.log("Event_History table created successfully");
  });

  connection.query(createBillingTableQuery, (err) => {

    if (err) {
      console.error("Error creating the table: " + err);
    } else {
      console.log("Billing_Inventory Table created successfully");
    }
  });

  connection.query(createPurchaseTableQuery, (err) => {
    if (err) {
      console.error("Error creating the table: " + err);
    } else {
      console.log("Purchase_Inventory Table created successfully");
    }
  });

  connection.query(createStockTableQuery, (err) => {
    if (err) {
      console.error("Error creating the table: " + err);
    } else {
      console.log("Stock_Inventory Table created successfully");
    }
  });
  connection.release();

});

async function generateInvoiceNumber() {
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(2);
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");

  const getLastInvoiceNumberQuery =
    "SELECT MAX(CAST(SUBSTRING(invoice_number, 7) AS UNSIGNED)) as lastInvoiceNumber FROM Billing_Inventory";

  const lastInvoiceNumberResult = await new Promise((resolve, reject) => {
    db.query(getLastInvoiceNumberQuery, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0].lastInvoiceNumber || 0);
      }
    });
  });

  const nextInvoiceNumber = `${year}${month}${day}${String(
    lastInvoiceNumberResult + 1
  ).padStart(5, "0")}`;
  return nextInvoiceNumber;
}


app.post("/billing", async (req, res) => {
  try {
    const billingData = req.body;

    const stockAvailabilityPromises = [];
    const errors = [];
    const updatedMedicineQuantities = new Map();

    for (const row of billingData.medicineRows) {
      const { qty, medicinename } = row;
      const { name, dosage } = extractMedicineInfo(medicinename);

      // Check if the medicine already exists in the map
      if (updatedMedicineQuantities.has(medicinename)) {
        // If it does, add the quantity to the existing value
        const existingQty = updatedMedicineQuantities.get(medicinename);
        updatedMedicineQuantities.set(medicinename, existingQty + parseInt(qty));
      } else {
        // Otherwise, initialize with the quantity
        updatedMedicineQuantities.set(medicinename, parseInt(qty));
      }
    }

    // Check stock availability and push promises
    for (const [medicinename, qty] of updatedMedicineQuantities.entries()) {
      const { name, dosage } = extractMedicineInfo(medicinename);

      stockAvailabilityPromises.push(new Promise((resolve, reject) => {
        const checkStockQuery = "SELECT totalqty FROM Stock_Inventory WHERE medicinename = ? AND dosage = ?";
        db.query(checkStockQuery, [name, dosage], (err, results) => {
          if (err) {
            errors.push(`Error checking stock availability for ${name} ${dosage}`);
            resolve();
          } else {
            if (results.length > 0) {
              const availableQty = results[0].totalqty;
              if (qty > availableQty) {
                errors.push(` Available quantity for (${name} ${dosage}) is ${availableQty}`);
              }
            } else {
              errors.push(`Stock details not found for (${name} ${dosage})`);
            }
            resolve();
          }
        });
      }));
    }

    await Promise.all(stockAvailabilityPromises);

    if (errors.length > 0) {
      console.error("Errors processing billing data:", errors);
      res.status(500).json({ error: "Errors processing billing data", messages: errors });
      return;
    }

    // Update stock inventory with aggregated quantities
    for (const [medicinename, qty] of updatedMedicineQuantities.entries()) {
      const { name, dosage } = extractMedicineInfo(medicinename);
      const updateStockQuery = "UPDATE Stock_Inventory SET totalqty = totalqty - ? WHERE medicinename = ? AND dosage = ?";

      db.query(updateStockQuery, [qty, name, dosage], (err, results) => {
        if (err) {
          console.error("Error updating Stock_Inventory quantity:", err);
        }
      });
    }

    const invoicenumber = await generateInvoiceNumber();
    const tabletDetails = {
      tablets: billingData.medicineRows.map((row) => ({
        medicinename: row.medicinename,
        qty: row.qty,
        qtyprice: row.qtyprice,
        total: row.total,
      })),
    };

    const istTimestamp = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

    const sql = `
      INSERT INTO Billing_Inventory
        (tabletdetails, subtotal, discount, grandtotal, patientname, doctorname, mobileno, cashgiven, balance, invoice_number, createdate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        JSON.stringify(tabletDetails),
        billingData.subtotal,
        billingData.discount,
        billingData.grandtotal,
        billingData.patientname,
        billingData.doctorname,
        billingData.mobileno,
        billingData.cashgiven,
        billingData.balance,
        invoicenumber,
        istTimestamp,
      ],
      (err, result) => {
        if (err) throw err;
        res.json({
          message: "Billing_Inventory data inserted successfully!",
          invoicenumber,
        });
      }
    );
  } catch (error) {
    console.error("Error processing billing data:", error);
    res.status(500).json({ error: "Error processing billing data" });
  }
});


app.get("/billingdata", (req, res) => {
  const sql = "SELECT * FROM `Billing_Inventory`";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: "Error fetching data" });
      return;
    }
    res.json(results);
  });
});

app.get("/allstock", (req, res) => {
  const { medicinename, dosage } = req.query;

  if (!medicinename) {
    res.status(400).json({ error: "Medicine name is required" });
    return;
  }
  const sql =
    "SELECT * FROM Stock_Inventory WHERE medicinename = ? AND dosage = ?";

  db.query(sql, [medicinename, dosage], (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: "Error fetching data" });
      return;
    }

    if (!results || results.length === 0) {
      res.status(404).json({ error: "Medicine not found" });
      return;
    }

    const expiryDateString = results[0].expirydate;
    const expiryDate = new Date(expiryDateString + 'Z');
    const currentDate = new Date();

    if (expiryDate <= currentDate) {
      res.json({ expired: expiryDate.toISOString().split("T")[0] });
    } else {
      res.json({ expired: false });
    }
  });
});

app.get("/stock", (req, res) => {
  const { medicinename } = req.query;

  let sql = "SELECT * FROM Stock_Inventory";

  if (medicinename) {
    sql += " WHERE medicinename LIKE ?";
  }

  db.query(sql, [medicinename ? `%${medicinename}%` : null], (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: "Error fetching data" });
      return;
    }
    res.json(results);
  });
});

app.delete("/stock/delete/:id", (req, res) => {
  const id = req.params.id;

  const deleteStockSql = "DELETE FROM Stock_Inventory WHERE id = ?";
  db.query(deleteStockSql, [id], (err, stockResults) => {
    if (err) {
      console.error("Error deleting from Stock_Inventory table:", err);
      res.status(500).json({ error: "Error deleting from Stock_Inventory table" });
      return;
    }
    res.status(200).json({ message: "Stock item deleted successfully" });
  });
});

app.put('/stock/update/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;



  const updateStockQuery = `
    UPDATE Stock_Inventory 
    SET medicinename = ?, 
        brandname = ?, 
        dosage = ?, 
        purchaseprice = ?, 
        totalqty = ?, 
        purchaseamount = ?, 
        mrp = ?, 
        expirydate = ?
    WHERE id = ?
  `;

  const { medicinename, brandname, dosage, purchaseprice, totalqty, purchaseamount, mrp, expirydate } = updatedData;

  const formattedExpiryDate = moment(expirydate).format('YYYY-MM-DD HH:mm:ss');



  const values = [
    medicinename,
    brandname,
    dosage,
    purchaseprice,
    totalqty,
    purchaseamount,
    mrp,
    formattedExpiryDate,
    id
  ];

  db.query(updateStockQuery, values, (err, result) => {
    if (err) {
      console.error("Error updating Stock_Inventory:", err);
      res.status(500).send("Internal Server Error");
    } else {
      console.log("Stock item updated successfully");
      res.status(200).json({ message: 'Stock item updated successfully', data: updatedData });
    }
  });
});

app.post("/purchase", (req, res) => {
  const {
    medicinename,
    brandname,
    otherdetails,
    purchaseprice,
    totalqty,
    purchaseamount,
    dosage,
    expirydate,
    mrp,
  } = req.body;

  const formattedMRP = `${mrp}`;

  const istTimestamp = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

  const expiryDateIST = moment(expirydate).tz("Asia/Kolkata").format("YYYY-MM-DD");


  const insertPurchaseQuery = `
    INSERT INTO Purchase_Inventory 
      (medicinename, brandname, otherdetails, purchaseprice, totalqty, purchaseamount, dosage, expirydate, mrp,time) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  `;

  const valuesPurchase = [
    medicinename,
    brandname,
    otherdetails,
    purchaseprice,
    totalqty,
    purchaseamount,
    dosage,
    expiryDateIST, // Insert the formatted expiry date
    formattedMRP,
    istTimestamp,
  ];

  db.query(insertPurchaseQuery, valuesPurchase, (err, result) => {
    if (err) {
      console.error("Error inserting data into Purchase_Inventory table:", err);
      res.status(500).send("Internal Server Error");
    } else {
      console.log("Data inserted into Purchase_Inventory table successfully");
      const selectStockQuery =
        "SELECT * FROM Stock_Inventory WHERE medicinename = ? AND dosage = ?";

      db.query(
        selectStockQuery,
        [medicinename, dosage],
        (selectErr, selectResults) => {
          if (selectErr) {
            console.error("Error selecting from Stock_Inventory:", selectErr);
            res.status(500).send("Internal Server Error");
          } else if (selectResults.length > 0) {
            const existingQuantity = selectResults[0].totalqty;
            const updatedQuantity = existingQuantity + totalqty;

            const updateStockQuery = `
            UPDATE Stock_Inventory 
            SET totalqty = ?, 
                purchaseprice = ?, 
                purchaseamount = ?, 
                purchasedate = CURDATE(), 
                expirydate = ?,
                mrp = ?
            WHERE medicinename = ? AND dosage = ?
          `;

            const valuesStock = [
              updatedQuantity,
              purchaseprice,
              purchaseamount,
              expirydate,
              mrp,
              medicinename,
              dosage,

            ];

            db.query(
              updateStockQuery,
              valuesStock,
              (updateErr, updateResult) => {
                if (updateErr) {
                  console.error("Error updating Stock_Inventory:", updateErr);
                  res.status(500).send("Internal Server Error");
                } else {
                  console.log(
                    "Data updated in Stock_Inventory table successfully"
                  );
                  res
                    .status(200)
                    .send("Data updated in Stock_Inventory successfully");
                }
              }
            );
          } else {
            const insertStockQuery = `
            INSERT INTO Stock_Inventory 
              (medicinename, dosage, brandname, purchaseprice, totalqty, purchaseamount, purchasedate, expirydate, mrp) 
              VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)
          `;

            const valuesStock = [
              medicinename,
              dosage,
              brandname,
              purchaseprice,
              totalqty,
              purchaseamount,
              expirydate,
              mrp
            ];

            db.query(insertStockQuery, valuesStock, (errStock, resultStock) => {
              if (errStock) {
                console.error(
                  "Error inserting data in Stock_Inventory table:",
                  errStock
                );
                res.status(500).send("Internal Server Error");
              } else {
                console.log(
                  "Data inserted into Stock_Inventory table successfully"
                );
                res
                  .status(200)
                  .send("Data inserted into Stock_Inventory successfully");
              }
            });
          }
        }
      );
    }
  });
});

app.get("/allpurchase", (req, res) => {
  const sql = "SELECT * FROM Purchase_Inventory";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: "Error fetching data" });
      return;
    }
    res.json(results);
  });
});

app.get("/quantity", (req, res) => {
  const { medicinename, dosage } = req.query;

  const selectQuantityQuery =
    "SELECT totalqty FROM Stock_Inventory WHERE medicinename = ? AND dosage = ?";

  db.query(selectQuantityQuery, [medicinename, dosage], (err, results) => {
    if (err) {
      console.error("Error fetching available quantity:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const availableQuantity = results.length > 0 ? results[0].totalqty : 0;

      res.status(200).json({ availableQuantity });
    }
  });
});

app.get("/getMRP", (req, res) => {
  const { medicinename, dosage } = req.query;

  const selectMRPQuery =
    "SELECT mrp FROM Stock_Inventory WHERE medicinename = ? AND dosage = ?";

  db.query(selectMRPQuery, [medicinename, dosage], (err, results) => {
    if (err) {
      console.error("Error fetching MRP:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const mrp = results.length > 0 ? results[0].mrp : null;
      res.status(200).json({ mrp });
    }
  });
});

app.get("/suggestions", (req, res) => {

  const tabletSuggestionsQuery =
    " SELECT CONCAT(medicinename, ' ', dosage) AS medicine_info FROM Stock_Inventory;";

  db.query(tabletSuggestionsQuery, (err, results) => {
    if (err) {
      console.error("Error fetching tablet suggestions:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } res.json(results);


  });
});

app.get("/billingdata/:invoice_number", (req, res) => {
  const { invoice_number } = req.params;
  const sql = "SELECT * FROM `Billing_Inventory` WHERE invoice_number = ?";

  db.query(sql, [invoice_number], (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: "Error fetching data" });
      return;
    }
    res.json(results);
  });
});


const extractMedicineInfo = (tabletname) => {
  const lastSpaceIndex = tabletname.lastIndexOf(" ");

  if (lastSpaceIndex !== -1) {
    const dosage = tabletname.substring(lastSpaceIndex + 1).trim();
    const name = tabletname.substring(0, lastSpaceIndex);

    return { name, dosage };
  } else {
    console.log("Invalid tablet name format");
    return { name: "", dosage: "" };
  }
};



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});