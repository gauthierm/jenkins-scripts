/* eslint-disable no-unused-vars */

const Slack = require('slack');
const Promise = require('bluebird');

const bot = new Slack({ token: process.env.SLACK_BOT_TOKEN });

function getActiveOrganizationUsers() {
  return Promise.resolve(
    bot.users.list({}).then(data => data.members.filter(user => !user.deleted))
  );
}

module.exports = function notifySlackUser(user, buildInformation, callback) {
  getActiveOrganizationUsers()
    .then(slackUsers => {
      const realNameMatch = slackUsers.filter(
        slackUser => user.displayName === slackUser.real_name
      );
      const userNameMatch = slackUsers.filter(
        slackUser => user.userName === slackUser.name
      );

      if (realNameMatch.length === 0 && userNameMatch.length === 0) {
        callback('Unable to match GitHub user to Slack user');
      }

      const userToContact =
        realNameMatch.length > 0 ? realNameMatch[0] : userNameMatch[0];
      bot.im
        .open({ user: userToContact.id })
        .then(response => {
          if (!response.ok) {
            console.log(
              `Error opening Slack Message Channel with ${
                userToContact.real_name
              }`
            );
            callback(response);
          }

          bot.chat
            .postMessage({
              channel: response.channel.id,
              text: `Your PR _${buildInformation.prName}_ in _${
                buildInformation.repoName
              }_ failed CI during the _${buildInformation.stageName}_ stage. <${
                buildInformation.ciLink
              }|View in Jenkins>`
            })
            .then(data => callback(null, 'Success!'))
            .catch(err => callback(err));
        })
        .catch(err => callback(err));
    })
    .catch(err => callback(err));
};