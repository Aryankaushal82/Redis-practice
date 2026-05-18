import express from 'express';
import Redis from 'ioredis';
import mongoose from 'mongoose';


const app = express()
app.use(express.json())


const redis = new Redis(
process.env.REDIS_URL || 'redis://localhost:6379'
)


app.get('/redis',async(req,res)=>{
    const reply = await redis.ping()
    return res.json({ redis:reply })
})

app.get('/mongo',async(req,res)=>{
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/chai_aur_redis')
        }
        return res.json({ mongo:'connected',name:mongoose.connection.name })
    } catch (error) {
        return res.json({ mongo:'error', error })
    }
})



// constants
const BANNER_KEY = "app:banner";


app.post('/banner',async(req,res)=>{
    try {
        const {message} = req.body
        if(!message){
            return res.status(400).json({error:'Message is required'})
        }
        await redis.set(BANNER_KEY,message)
        return res.json({success:true,message:'Banner updated'})
    } catch (error) {
        return res.status(500).json({error:'Internal Server Error', details:error.message})
    }
})

app.get('/banner',async(req,res)=>{
    try {
        const banner = await redis.get(BANNER_KEY)
        return res.json({success:true,banner})
    } catch (error) {
        return res.status(500).json({error:'Internal Server Error', details:error.message})
    }
})

app.delete('/banner',async(req,res)=>{
    try {
        await redis.del(BANNER_KEY) 
        return res.json({success:true,message:'Banner deleted'})
    } catch (error) {
        return res.status(500).json({error:'Internal Server Error', details:error.message})
    }
})

app.get('/banner/exists',async(req,res)=>{
    try {
        const exists = await redis.exists(BANNER_KEY)
        return res.json({success:true,exists:Boolean(exists)})
    } catch (error) {
        return res.status(500).json({error:'Internal Server Error', details:error.message})
    }  
})



// otp

const otpKey = (phone)=>{
    return `otp:${phone}`
}


app.post('/otp',async(req,res)=>{
    const {phone} = req.body
    if (!phone){
        return res.status(400).json({error:'Phone number is required'})
    }
    const otp = Math.floor(100000 + Math.random()*9000000).toString()
    await redis.set(otpKey(phone),otp,'EX',300)
    return res.json({success:true,message:`OTP sent to ${phone}`,otp})
})

app.post('/otp/verify',async(req,res)=>{
    const {phone,otp} = req.body
    if (!phone || !otp){
        return res.status(400).json({error:'Phone number and OTP are required'})
    }
    const storedOtp = await redis.get(otpKey(phone))
    if (!storedOtp){
        return res.status(400).json({success:false,message:'OTP expired or not found'})
    }
    if (storedOtp === otp){
        await redis.del(otpKey(phone))
        return res.json({success:true,message:'OTP verified successfully'})
    }
    return res.status(400).json({success:false,message:'Invalid OTP'})
})

app.get('/otp/ttl/:phone',async(req,res)=>{
    const {phone} = req.params
    if (!phone){
        return res.status(400).json({error:'Phone number is required'})
    }
    const ttl = await redis.ttl(otpKey(phone))
    return res.json({success:true,ttl})
})



const PORT = process.env.PORT || 3002
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})