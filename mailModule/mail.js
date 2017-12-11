const nodemailer = require('nodemailer');

// Generate test SMTP service account from ethereal.email
// Only needed if you don't have a real mail account for testing

    // create reusable transporter object using the default SMTP transport
    //********create dummy gmail account*****
    let transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "rahul.lionelmessi@gmail.com",
            pass: "messixaviiniesta1068"
        }
    });

    // setup email data with unicode symbols
    //create dummy gmail account
    let mailOptions = {
        from: 'rahul.lionelmessi@gmail.com', // sender address
        to: 'vibhu2395@gmail.com', // list of receivers
        subject: 'Booking confirmation from Parkplace', // Subject line
        text: 'You have succesfully made a booking', // plain text body
        html: `<b>You have succesfully made a booking on Parkingplace</b>
               <p>Deails:</p> `// html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });



