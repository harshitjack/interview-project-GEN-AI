const mongoose = require('mongoose')

async function connectToDB(){
    await mongoose.connect(process.env.MONGO_DB)
    .then(()=>{
console.log('connect to db')
    }).catch(err=>{
        console.log('error')
    })
}

module.exports = connectToDB