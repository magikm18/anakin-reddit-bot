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

//Keep track of everything we have commented on, if we
//find a reply to one of our comments we can check for good bot/bad bot.
let commentIds = [];

stream.on('comment', c => {
    console.log(c.author.name + ': ' + c.body);

    //make sure we're not replying to ourselves.
    if (c.author.name === 'anakin-bot')
        return;

    //Go through each possible response and look for a match.
    const reply = findMessageReply(c);
    
    if (!reply)
        return;

    console.log(`Found message: ${c.body}`);
    console.log(`Responding with: ${reply}`);
    
    c.reply(reply)
    .then(resp => {
        console.log(`Responded to message (${resp.id})`);

        commentIds.push('t1_' + resp.id);
    })
    .catch(err => {
        console.error(err);
    });
});

function findMessageReply(comment) {
    if (commentIds.includes(comment.parent_id)) {
        //This comment is a reply to one of ours, check for a reply.
        for(let i = 0; i < responses.replies.length; i++) {
            let resp = responses.replies[i];
            let regex = new RegExp(resp.pattern, 'gi');
            let matches = regex.exec(comment.body);

            if (matches && matches.length > 0) {
                //Return a random response.
                return resp.responses[Math.floor(Math.random() * resp.responses.length)];
            }
        }
    }

    //if we get to here then check if the comment contains one of
    //our key phrases and send back a response.
    for(let i = 0; i < responses.messages.length; i++) {
        let resp = responses.messages[i];
        let regex = new RegExp(resp.pattern, 'gi');
        let matches = regex.exec(comment.body);

        if (matches && matches.length > 0) {
            //Check the ignore pattern.
            if (resp.ignorePattern) {
                let ignoreRegex = new RegExp(resp.ignorePattern, 'gi');
                let ignoreMatches = ignoreRegex.exec(comment.body);

                if (ignoreMatches && ignoreMatches.length > 0)
                    return;
            }

            let message;

            //if the response contains an array of responses, then pick
            //a random response.
            if (resp.responses)
                message = resp.responses[Math.floor(Math.random() * resp.responses.length)];
            else
                message = resp.response;

            //Check if the message contains any keywords.
            if (message.indexOf('$username') > -1) {
                message = message.replace('$username', comment.author.name);
            }

            return message;
        }
    }

    return null;
}