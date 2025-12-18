const express=require('express');
const cors=require('cors');
const jwt=require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app=express();
const port=process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tqysnnt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const districtsCollection=client.db("diagnosticDB").collection("districts");
    const upazillasCollection=client.db("diagnosticDB").collection("upazilas");
    const usersCollection=client.db("diagnosticDB").collection("users");
    const testCollection=client.db("diagnosticDB").collection("test");
    const reservationCollection=client.db("diagnosticDB").collection("reservation");
    const bannerCollection=client.db("diagnosticDB").collection("banner");
    const paymentCollection=client.db("diagnosticDB").collection("payment");
    const recommendationCollection=client.db("diagnosticDB").collection("recommendation");

    // jwt related api
    app.post('/jwt', async (req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'3d'});
      res.send({token});
    })

    // middlewares
    const verifyToken = (req,res,next) =>{
      console.log('inside verify token',req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message:'unauthorized access!!'});
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) =>{
        if(err){
          return res.status(401).send({message:'forbidden access'});

        }
        req.decoded = decoded;
        next();
      })
      
      // next();
    }
    
    // use verify admin after verifyToken
    const verifyAdmin= async (req,res,next) =>{
      const email=req.decoded.email;
      const query ={email:email};
      const user=await usersCollection.findOne(query);
      const isAdmin=user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message:'forbidden access' });
      }
      next();
    }
    
   
    

    app.get('/districts',async(req,res)=>{
        const result=await districtsCollection.find().toArray();
        res.send(result);
    })
    app.get('/recommendation',async(req,res)=>{
        const result=await recommendationCollection.find().toArray();
        res.send(result);
    })

    app.get('/upazillas',async(req,res)=>{
        const result=await upazillasCollection.find().toArray();
        res.send(result);
    })
    app.get('/test',async(req,res)=>{
        const result=await testCollection.find().toArray();
        res.send(result);
    })
    app.post('/test',verifyToken,verifyAdmin, async (req,res) => {
      const item = req.body;
      const result = await testCollection.insertOne(item);
      res.send(result);
    })
    app.delete('/test/:id',verifyToken,verifyAdmin, async (req,res)=>{
      const id = req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await testCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/tests/:id', async (req,res)=>{
        const id = req.params.id;
        const query={_id:new ObjectId(id)};
        const result=await testCollection.findOne(query);
        res.send(result);
    })
    app.get('/test/payment/:id', async (req,res)=>{
        const id = req.params.id;
        const query={_id:new ObjectId(id)};
        const result=await testCollection.findOne(query);
        res.send(result);
    })
    app.patch('/tests/:id',async (req,res) =>{
        const id=req.params.id;
        const filter={_id:new ObjectId(id)};
        const updatedDoc={
          $inc:{
            slots:-1
          }
        }
        const result=await testCollection.updateOne(filter,updatedDoc);
        res.send(result);
    })
    app.patch('/test/:id',async (req,res)=>{
      const data=req.body;
      const id=req.params.id;
      const filter={_id:new ObjectId(id)};
      const updatedDoc = {
        $set: {
          testName :data.testName,
            imageUrl:data.imageUrl,
            details:data.details,
            price:data.price,
            date:data.date,
            slots:data.slots,
        }
      }
      const result = await testCollection.updateOne(filter,updatedDoc);
      res.send(result);
    })

    // users related api
    
    app.post('/users', async (req,res) => {
      const users = req.body;
      const result = await usersCollection.insertOne(users);
      res.send(result);
    })

    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
        const result=await usersCollection.find().toArray();
        res.send(result);

    })
    app.get('/users/:id', async (req,res)=>{
      const id = req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await usersCollection.findOne(query);
      res.send(result);
  })
    
    
    
    app.patch('/users/blocked/:id',verifyToken,verifyAdmin,async (req,res) =>{
      
      const id=req.params.id;
      const filter={_id:new ObjectId(id)};
      const updatedDoc={
        $set:{
          status:'blocked'
        }
      }
      
      
      const result=await usersCollection.updateOne(filter,updatedDoc);
      
      
      res.send(result);
    })
    
    app.get('/users/admin/:email',verifyToken, async(req,res)=>{
      const email=req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query ={email:email};
      const user=await usersCollection.findOne(query);
      let admin=false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({admin})
    })

    app.patch('/users/admin/:id',verifyToken,verifyAdmin,async (req,res) =>{
      const id=req.params.id;
      const filter={_id:new ObjectId(id)};
      const updatedDoc={
        $set:{
          role:'admin'
        }
      }
      const result=await usersCollection.updateOne(filter,updatedDoc);
      res.send(result);
    })
    // banner
    app.delete('/banner/:id',verifyToken,verifyAdmin, async (req,res)=>{
      const id = req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await bannerCollection.deleteOne(query);
      res.send(result);
    })
    app.post('/banner',verifyToken,verifyAdmin, async (req,res) => {
      const item = req.body;
      const result = await bannerCollection.insertOne(item);
      res.send(result);
    })
    app.get('/banner',async(req,res)=>{
      const result=await bannerCollection.find().toArray();
      res.send(result);

  })
  app.patch('/banner/:id',verifyToken,verifyAdmin,async (req,res) =>{
    const banner=req.body;
    const id=req.params.id;
    const filter={_id:new ObjectId(id)};
    const updatedDoc={
      $set:{
        isActive:banner.isActive
      }
    }
    
    await bannerCollection.updateMany({}, { $set: { isActive: 'false' } });
    const result=await bannerCollection.updateOne(filter,updatedDoc);
    
    
    res.send(result);
  })
    // reservation
    app.post('/reservation',async(req,res)=>{
        const reservation=req.body;
        const result=await reservationCollection.insertOne(reservation);
        res.send(result);
  
    })
      
      
    app.get('/reservation',async(req,res)=>{
          const email=req.query.email;
          const query={email:email};
          const result=await reservationCollection.find(query).toArray();
          res.send(result);
  
    })
    
    app.delete('/reservation/:id', async(req,res)=>{
        const id = req.params.id;
        const query={_id:new ObjectId(id)};
        const result=await reservationCollection.deleteOne(query);
        res.send(result);
      })
      // payment
      app.post('/create-payment-intent', async (req, res) => {
        const { price } = req.body;
        const amount = parseInt(price*100);
      
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types:['card']
         
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        })
      })
  
      app.get('/payments/:email',verifyAdmin, async(req,res)=>{
        const query = {email: req.params.email};
        
        if(req.params.email !== req.decoded.email) {
          return res.status(403).send({message: 'forbidden access'});
        }
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      })
  
      app.post('/payments', async(req,res)=>{
        const payment = req.body;
        const paymentResult = await paymentCollection.insertOne(payment);
  
        // carefully delete each item from the cart
        console.log('payment info', payment);
        const query = {_id:{
          $in: payment.reservationId.map(id => new ObjectId(id))
        }}
        const deleteResult = await reservationCollection.deleteMany(query);
        res.send({paymentResult,deleteResult});
      })
      app.get('/payments',async(req,res)=>{
        const email=req.query.email;
        const query={email:email};
        const result=await paymentCollection.find(query).toArray();
        res.send(result);

     })
     
     app.delete('/payments/:id', async(req,res)=>{
      const id = req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await paymentCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/payment',async(req,res)=>{
      const result=await paymentCollection.find().toArray();
      res.send(result);

  })
  app.patch('/payment/:id',verifyToken,verifyAdmin,async (req,res) =>{
    const report=req.body;
    const id=req.params.id;
    const filter={_id:new ObjectId(id)};
    const updatedDoc={
      $set:{
        status:report.status
      }
    }
    
    
    const result=await paymentCollection.updateOne(filter,updatedDoc);
    
    
    res.send(result);
  })
  app.delete('/payment/:id',verifyToken,verifyAdmin, async(req,res)=>{
    const id = req.params.id;
    const query={_id:new ObjectId(id)};
    const result=await paymentCollection.deleteOne(query);
    res.send(result);
  })
  // using aggregate pipeline
  app.get('/order-stats',verifyToken, verifyAdmin, async(req,res)=>{
    const result = await paymentCollection.aggregate([
      {
        $unwind: '$reservationId'
      },
      {
        $lookup:{
          from: 'testCollection',
          localField: 'reservationId',
          foreignField: '_id',
          as: 'testItems'
        }
      },
      {
        $unwind: '$testItems'
      }
      
      ,
      {
        $group: {
          _id: '$testItems.name',
          quantity:{$sum:1},
          revenue: {$sum:'$menuItems.price'}
        }
      },
      {
        $project: {
          _id:0,
          category: '$_id',
          quantity: '$quantity',
          revenue: '$revenue'
        }
      }

    ]).toArray();
    res.send(result);
  })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);







app.get('/',(req,res)=>{
    res.send('Diagnostic Center is sitting');
})

app.listen(port,()=>{
    console.log(`Diagnostic Center is sitting on port ${port}`)
})