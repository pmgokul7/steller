const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const con = require("./config/connection");
const cloudinary = require("cloudinary").v2;
const session = require("express-session");
const flash = require("connect-flash");
const otpgen = require("otp-generators");
const client = require("twilio")(
  "AC310ba1f6e25df76fe77562d899355658",
  "f181af19d88019bab6b437c2aaa7ef68"
);
const helper = require("./helpers/LoginHelpers");
var base64ToImage = require("base64-to-image");
const paypal = require("paypal-rest-sdk");
const Razorpay = require("razorpay");




paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id:
    "ASRe872F9Xekn-YKrsWB65y1Y1OirSehIBbNFus5fIkbxrGwWuB2RGB6PAsqjrtXYyduNrH_UHRNaleD",
  client_secret:
    "EI0jsPvICu1X9i4_M65S7KYSqy1Y8EdPngbr6rUUI3Qpcsohp5f9dHJRiuuNhMt_USFXUfgmxqeYIH2z",
});

var instance = new Razorpay({
      key_id: "rzp_test_Zh6pjzUFwDGrQD",
      key_secret: "YPOZcl2ZZAHkr6dwZaDTaQwA",
    });



const userRoute = require("./routes/user/user");
const adminRoute = require("./routes/user/admin");
const loginRoute = require("./routes/user/login");
const { ObjectId } = require("mongodb");




cloudinary.config({
  cloud_name: "dem5z7tgz",
  api_key: "315628366858732",
  api_secret: "OV3JdlJ8TaJQUoukAPdmDxxcopA",
});

const storage = multer.diskStorage({
  destination: "./public/uploads",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

const app = express();
// app.use(function (req, res, next) {
//   if (!req.user) {
//     res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
//     res.header("Expires", "-1");
//     res.header("Pragma", "no-cache");
//   }
//   console.log(req.user);
//   next();
// });
app.use(
  session({
    secret: "key",
    saveUninitialized: false,
    cookie: { maxAge: 6000000 },
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(flash());
con.connect();
app.set("view engine", "ejs");
app.use(express.static("./assets/css"));

app.use("/home", userRoute);
app.use("/admin", adminRoute);
app.use("/login", loginRoute);

async function uploadToCloudinary(locaFilePath) {
  var mainFolder = "main";
  var filePathOnCloudinary = mainFolder + "/" + locaFilePath;
  return cloudinary.uploader
    .upload(locaFilePath, { public_id: filePathOnCloudinary })
    .then((result) => {
      return {
        message: "done",
        url: result.url,
      };
    });
}
app.post("/payment", (req, res) => {
  if(req.body.payment=='razorpay'){
  console.log("you chose razorpay");
  var options = {
    amount: 500000,  // amount in the smallest currency unit
    currency: "INR",
    receipt: "order_rcptid_11"
  };
  instance.orders.create(options, function(err, order) {
    console.log(order);
  });
  
   



  }
  else if(req.body.payment=='paypal'){
    console.log("you chose paypal");
    var create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "http://localhost:3000/home/success",
          "cancel_url": "http://cancel.url"
      },
      "transactions": [{
          "item_list": {
              "items": [{
                  "name": req.body.model,
                  "sku": "item",
                  "price": req.body.total,
                  "currency": "USD",
                  "quantity": req.body.quantity
              }]
          },
          "amount": {
              "currency": "USD",
              "total": req.body.total
          },
          "description": "This is the payment description."
      }]
  };
  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
        throw error;
    } else {
      console.log("Create Payment Response");
      console.log(payment);
      payment = payment.links.filter((data) => data.rel == "approval_url")[0];
      console.log(payment.href);
      console.log(req.body);
      redirect_url = payment.href;
      if (redirect_url) {
        res.redirect(redirect_url);
      }
    }
});




  }
console.log(req.body);
})
  




// app.post("/placeorder", (req, res) => {
//   var instance = new Razorpay({
//     key_id: "rzp_test_Zh6pjzUFwDGrQD",
//     key_secret: "YPOZcl2ZZAHkr6dwZaDTaQwA",
//   });
//   var options = {
//     amount: 45621,
//     currency: "INR",
//     receipt: "46sd4",
//   };
//   instance.orders.create(options, function (err, order) {
//     if (err) {
//       console.log(err);
//     }
//     console.log("new order:", order);
//     res.send({orderid:order.id});
//   });
// });















app.post("otp-send", (req, res) => {});

app.post(
  "/admin/products/add",
  upload.any("myImage"),
  async (req, res, next) => {
    console.log(req.body);
    con
      .get()
      .collection("Products")
      .insertOne(req.body)
      .then((response) => {
        console.log("details updated");
        console.log(response.insertedId);
        globalid = response.insertedId;
      });
    for (var i = 0; i < req.files.length; i++) {
      var locaFilePath = req.files[i].path;

      if (req.files[i].fieldname == "mainImage") {
        uploadToCloudinary(locaFilePath).then((r) => {
          con
            .get()
            .collection("Products")
            .updateOne({ _id: globalid }, { $set: { mainImage: r.url } })
            .then((err, res) => {
              console.log(err);
            });
        });
      }

      // var locaFilePath = req.files[i].path;
      uploadToCloudinary(locaFilePath)
        .then((result) => {
          con
            .get()
            .collection("Products")
            .updateOne({ _id: globalid }, { $push: { images: result.url } })
            .then(() => {
              console.log("req url:" + result.url);
              console.log("done");
            });
        })
        .then(() => {
          res.redirect("/admin/products");
          console.log(req.body);
        })

        .catch((er) => {
          console.log(er);
        });
    }
  }
);

app.get("/adminlogin", (req, res) => {
  msg = req.flash("info");
  res.render("admin/adminLogin");
});

app.post("/adminlogin", (req, res) => {
  helper.adminLoginValidator(req.body).then((result) => {
    if (result.adminlogged == true) {
      req.session.adminlogged = true;
      res.redirect("/admin");
    } else {
      req.flash("info", "incorrect Username or password");
      res.redirect("/adminlogin");
    }
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/home");
  } else {
    res.redirect("/login");
  }
});

app.post("/otp-auth", (req, res) => {
  if (req.body.mobile === otp) {
    req.session.user = ress;
    res.redirect("/home");
  } else {
    req.flash("info", "ivalid otp!retry");
    res.redirect("/otp-login");
  }
});

app.get("/register", (req, res) => {
  var msg = req.flash("info");
  res.render("user/userRegister", { msg });
});

app.post("/register", (req, res) => {
  const { user, mobile, email, password, confirm } = req.body;
  console.log(req.body);
  con
    .get()
    .collection("user")
    .findOne({ $or: [{ mobile: req.body.mobile }, { email: req.body.email }] })
    .then((result) => {
      if (
        req.body.user == "" ||
        req.body.mobile == "" ||
        req.body.email == "" ||
        req.body.password == "" ||
        req.body.confirm == ""
      ) {
        req.flash("info", "please fill all fields");
        res.redirect("/register");
      } else if (req.body.password != req.body.confirm) {
        req.flash("info", "password and confirm password should be same!");
        res.redirect("/register");
      } else if (result) {
        req.flash("info", "Mobile number or email is already used");
        res.redirect("/register");
      } else {
        helper.userSignupValidator(req.body).then(() => {
          console.log("regsitered");
          req.flash("info2", "user registered successfully");
          res.redirect("/login");
        });
      }
    });
});
app.post("/admin/products/edit", (req, res) => {
  con
    .get()
    .collection("Products")
    .updateOne(
      { _id: new ObjectId(req.query.id) },
      {
        $set: {
          model: req.body.model,
          brand: req.body.brand,
          ROM: req.body.ROM,
          RAM: req.body.RAM,
          stock: req.body.stock,
          rating: req.body.rating,
          highlights: req.body.highlights,
          description: req.body.description,
          category: req.body.category,
        },
      }
    )
    .then(() => {
      console.log("data updated");
      res.redirect("/admin/products");
    });
});

app.listen(3000, () => {
  console.log("server started");
});
