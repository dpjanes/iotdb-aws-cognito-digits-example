# CognitoDigits
## Purpose

This will demonstrate a simple web page using:

* Fabric / Digits for Login
* Node.JS and Express
* Cognito for User Identity & Data storage

You probably got here via a Google search. Congratulations, 
I hope you're at the right place!

## Setting Up

    cp config.json.template config.json


You'll have to set yourself up on AWS and on Fabric / Digits.
The process is too complicated to explain, but the links
below should help

## Origins

The original Digits login code comes from here:

* https://github.com/twitterdev/cannonball-web

The original Facebook login / Cognito Sync code was taken
from here - there's very little of this left now

* http://blog.backspace.academy/2015/03/using-cognito-with-node.html
* http://blog.backspace.academy/2015/03/using-cognito-with-nodejs-part-2.html
* http://blog.backspace.academy/2015/03/using-aws-cognito-with-nodejs-part-3.html

## Running

Run

    npm start

Connect:

    http://localhost:3000

