import mongoose from 'mongoose';

const Schema = mongoose.Schema;

export const OrderSchema = new Schema({
    UserName: {
        type: String,
    },
    TrackNum: {
        type: Number,
        required: 'Enter a tracking number'
    },
    WarehouseID: {
        type: Number,
        required: 'Enter a Warehouse ID'
    },
    DeliverAddress_X: {
        type: Number // required?? //format checking?? "x,y" where x and y are integers
    },
    DeliverAddress_Y: {
        type: Number // required?? //format checking?? "x,y" where x and y are integers
    },
    ItemType: {
        type: String
    },
    Status: {
        type: String
    },
    Priority: {
        type: Number,
        default: 1
    }
});

export const AccountSchema = new Schema({
    UserName: {
        type: String,
        required: 'Enter a username'
    },
    Password: {
        type: String,
        required: 'Enter a password',
        default: ""
    }
});
