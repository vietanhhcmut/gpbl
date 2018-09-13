const mongoose = require("mongoose");
const Accident = require('../models/Accident');
const geolib = require('geolib');

const isOvertime = ( time0, time1) => {
    const sub = time1.getMiliseconds() - time0.getMiliseconds();
    if (sub >= 30*60*1000) return true;
    return false;
}
module.exports = {
    handleInfo: async (req, res) => {
        // Add object to schema when user send info, check if it is too near
        const accidents = await Accident.find({status: true});
        const accident = req.body;
        let check = false;
        accidents.map(acc => {
            // const dis = Math.sqrt(Math.pow(acc.long - accident.long,2), Math.pow(acc.lat - accident.lat, 2));
            const dis = geolib.getDistance(
                {
                    latitude: acc.lat,
                    longitude: acc.long
                },
                {
                    latitude: accident.lat,
                    longitude: accident.long
                }
            );
            if (dis <= 10) check = true;
            return acc;
        });
        if (!check) {
            const a = new Accident(accident);
            try {
                await a.save();
                console.log("success");
            }
            catch(e) {
                console.log(e);
            }
        }
        else {
            console.log("Already had");
        }
        res.sendStatus(200);
    },
    handleLocation: async (req, res) => {
        // When user only send location, get data from db, consider what is out of date
        let accidents = await Accident.find({status: true});
        const { loc0, loc1 } = req.body;
        const today = new Date();
        let accs = [];
        accidents.map(acc => {
            // disable all accidents overtime
            if (isOvertime(acc.time, today)) {
                acc.status = false;
                try {
                    await Accident.findByIdAndUpdate(acc._id, { $set: { status: false }});
                }
                catch(e) {
                    console.log(e);
                }
            }
            else {
                // Check the distance and send back an array
                const dis0 = geolib.getDistance(
                    {
                        latitude: acc.lat,
                        longitude: acc.long
                    },
                    {
                        latitude: loc0.lat,
                        longitude: loc0.long
                    }
                );
                const dis1 = geolib.getDistance(
                    {
                        latitude: acc.lat,
                        longitude: acc.long
                    },
                    {
                        latitude: loc1.lat,
                        longitude: loc1.long
                    }
                );
                if (dis1 < dis0 && dis1 <= 1000 && dis1 > acc.rad) {
                    accs = [...accs, acc];
                }

            }
            return acc;
        });
        res.json(accs);
    }
}