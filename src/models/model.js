import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    TrackNum: {
        type: Number,
        required: 'Enter a tracking number'
    },
    WarehouseID: {
        type: Number,
        required: 'Enter a Warehouse ID'
    },
    DeliverAddress: {
        type: String
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
        required: 'Enter a password'
    },
    orders: [
        OrderSchema
    ],
});