require('dotenv').config();

const Snoowrap = require('snoowrap');
const Snoostorm = require('snoostorm');
const responses = require('./responses.json');

const reddit = new Snoowrap({
    userAgent: 'anakin-reply-bot',
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    username: process.env.REDDIT_USER,
    password: process.env.REDDIT_PASS
});

const client = new Snoostorm(reddit);

const stream = client.CommentStream({
    subreddit: 'PrequelMemes',
    results: 100
});

stream.on('comment', c => {
    console.log(c.author.name + ': ' + c.body);

    //TODO: make sure we're not replying to ourselves.

    //Go through each possible response and look for a match.
    const reply = findMessageReply(c);
    
    if (!reply)
        return;

    console.log(`Found message: ${c.body}`);
    console.log(`Responding with: ${reply}`);
    
    c.reply(reply)
    .then(resp => {
        console.log(`Responded to message (${resp.id})`);
    })
    .catch(err => {
        console.error(err);
    });
});

function findMessageReply(comment) {
    for(let i = 0; i < responses.messages.length; i++) {
        let regex = new RegExp(responses.messages[i].pattern, 'gi');
        let matches = regex.exec(comment.body);

        if (matches && matches.length > 0) {
            let message = responses.messages[i].response;

            //Check if the message contains any keywords.
            if (message.indexOf('$username') > -1) {
                message = message.replace('$username', comment.author.name);
            }

            return message;
        }
    }

    return null;
}