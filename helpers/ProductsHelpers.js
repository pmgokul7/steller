const db = require("../config/connection");
const {ObjectId} = require("mongodb");
const collectionNames = require("../config/collectionNames")

module.exports = {
    searchByOs:(data)=>{
        return new Promise(async(resolve,reject)=>{
           var result=await db.get().collection("Products").find({OS: data.query.os}).toArray()
           resolve({result})
               
           
        })
    },
    info: (data) => {
        return new Promise(async (resolve, reject) => {
            var result = await db.get().collection(collectionNames.PRODUCT_COLLECTION).findOne({
                _id: ObjectId(data.query.id)
            })
            console.log("jhgf",data.session);
           if(data.session.user){
            var ifres = await db.get().collection(collectionNames.USER_CART).findOne({
                $and: [
                    {
                        "products.product": ObjectId(data.query.id)
                    }, {
                        user: ObjectId(data.session.user._id)
                    },
                ]
            })
       
            
            var wishlistp = await db.get().collection(collectionNames.WISHLIST_COLLECTION).findOne({
                $and: [
                    {
                        "products.product": ObjectId(data.query.id)
                    }, {
                        user: ObjectId(data.session.user._id)
                    }
                ]
            })

            console.log("found");
           }
           else{
            console.log("not found");
           }
            
            if (ifres && wishlistp) {
                resolve({result, ifres, wishlistp});
            } else if (ifres) {
                resolve({result, ifres});
            } else if (wishlistp) {
                resolve({result, wishlistp});
            } else {
                resolve({result});
            }


        });
    },

    productSearchHelper: (data) => {
        return new Promise(async (resolve, reject) => {
            var result = await db.get().collection(collectionNames.PRODUCT_COLLECTION).find({
                isDeleted:false,
                model: {
                    $regex: data.body.search,
                    $options: "i"
                }
            }).toArray()


            searcsh = data.body.search;
            resolve({result, searcsh, user: data.session.user})


        })
    }
}
