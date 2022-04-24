import mongoose from 'mongoose';
import { AccountSchema, OrderSchema } from '../models/model';
import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import {sendRequestToWorld} from '../../app';

const Account = mongoose.model('Account', AccountSchema);
const Order = mongoose.model('Order', OrderSchema);

// Deal with ACK
const scheduler = new ToadScheduler();

export const signupUser = (req, res) => {
    Account.findOne({"UserName" : req.body.UserName}, (err, account) => {
        if (err) {
            res.send(err);
        }

        if (account) {
            res.render("./pages/index", {login: true , error: true, msg: "Username already exists!"});
        }
        else{
            delete req.body['submitBtn']
            let newAccount = new Account(req.body);

            newAccount.save((err, contact) => {
                if (err) {
                    res.send(err);
                }
                res.render("./pages/index", {login:false, error: false, order:""});
            });
        }
    });
}

export const loginUser = (req, res, next) => {
    Account.findOne({"UserName" : req.body.UserName}, (err, account) => {
        if (err) {
            res.send(err);
        }
        if (account) {
            if(account.Password == req.body.Password){
                //next();
                req.app.set('UseName', req.body.UserName);
                res.redirect('/personal-page/');
            }
            else{ // Incorrect password
                res.render("./pages/index", {login: true , error: true, msg: "Incorrect password!"});
            }
        }
        else{ // UserName doesn't exist
            res.render("./pages/index", {login: true , error: true, msg: "Username doesn't exists!"});
        }
    });
}

export const getYourOrder = (req, res) => {
    // Order.find({"UserName" : req.body.UserName}, (err, userOrders) => {
    Order.find({"UserName" : req.app.get('UseName')}, (err, userOrders) => {
        if (err) {
            res.send(err);
        }
        res.render("./pages/personal", {orders:userOrders });
    });
}

export const getTrackingInfo = (req, res) => {
    Order.findOne({"TrackNum" : req.body.TrackNum}, (err, TrackingOrder) => {
        if (err) {
            // res.send(err);
            res.render("./pages/index", {login: false , error: true, order:"", msg: err});
            return;
        }
        if (TrackingOrder) {
            res.render("./pages/index", {login: false , error: false, order: TrackingOrder});
        }
        else{
            res.render("./pages/index", {login: false , error: true, order:"", msg: "Tracking number doesn't exists!"});
        }
    });
}

export const editAddress = (req, res, next) => {
    const regex = new RegExp('[0-9]+,[0-9]+');
    let result = regex.test(req.body.DeliverAddress);

    req.app.set('UseName', req.body.UserName);

    if(!result){
        next();
    }
    else{
        let processed_address = req.body.DeliverAddress.split(',', 2);

        Order.findOneAndUpdate({"TrackNum" : req.body.TrackNum, 'Status': "preparing"},
                                {"DeliverAddress_X" : processed_address[0],
                                "DeliverAddress_Y" : processed_address[1]}, (err, contact) => {
            if (err) {
                res.send(err);
            }
            next();
        });
    }
}

export async function sendPackageToWorld(command){
    // Deal with ACK
    const task = new AsyncTask(
        'SimpleWorldReqeust', 
        sendRequestToWorld(command),
        (err) => { console.log("SimpleWorldRequest send failed") }
    )

    const job = new SimpleIntervalJob({ seconds: 2, }, task);
    scheduler.addSimpleIntervalJob(job);
}

export async function addNewOrder(reqOrderJson, trackingNumber) {

    const regex = new RegExp('[0-9]+,[0-9]+');
    let result = regex.test(reqOrderJson.startDelivery.address);

    if(!result){
        throw new Error("Invalid delivery address format");
    }
    
    let processed_address = reqOrderJson.startDelivery.address.split(',', 2);
    let newOrder = new Order({'WarehouseID': reqOrderJson.startDelivery.warehouseID,
        'ItemType': reqOrderJson.startDelivery.item,
        'DeliverAddress_X': processed_address[0],
        'DeliverAddress_Y': processed_address[1],
        'UserName': reqOrderJson.startDelivery.UPS_account,
        'TrackNum': trackingNumber,
        'Status': "preparing",
        'Priority': reqOrderJson.startDelivery.priority
    });

    try{
        await newOrder.save();
        // console.log(result);
    } catch (err) {
        throw err;
    }
}

export async function editOrderAddress(trackingNumber, newAddress) {
    try {
        const regex = new RegExp('[0-9]+,[0-9]+');
        let result = regex.test(newAddress);

        if(!result){
            throw new Error("Invalid delivery address format");
        }
        
        result = await Order.findOneAndUpdate({"TrackNum" : trackingNumber}, 
                                                    {"DeliverAddress" : newAddress});
        if(!result){
            throw new Error("Invalid tracking number");
        }
        if (result.Status !== 'preparing') {
            throw new Error("Package already delivering");
        }
        return result;
    } catch (err) {
        throw err;
    }
}

export async function getOrderStatus(trackingNumber) {
    try {
        let result = await Order.findOne({'TrackNum': trackingNumber});
        if(!result){
            throw new Error("Invalid tracking number");
        }
        return result;
    } catch (err) {
        throw err;
    }
}


export async function getOrderAndUpdateStatus(trackingNumber, status) {
    try {
        let result = await Order.findOneAndUpdate({'TrackNum': trackingNumber}, {'Status': status});
        if(!result){
            throw new Error("Invalid tracking number");
        }
        return result;
    } catch (err) {
        throw err;
    }
}



// export const addnewContact = (req, res) => {
//     let newContact = new Contact(req.body);

//     newContact.save((err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const getContacts = (req, res) => {
//     console.log(req.body.UserName)
//     Contact.findOne({"UserName" : req.body.UserName}, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const getContactWithID = (req, res) => {
//     Contact.findById(req.params.contactID, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const updateContact = (req, res) => {
//     Contact.findOneAndUpdate({ _id: req.params.contactID}, req.body, { new: true, useFindAndModify: false }, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const deleteContact = (req, res) => {
//     Contact.remove({ _id: req.params.contactID}, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json({ message: 'successfuly deleted contact'});
//     });
// }
