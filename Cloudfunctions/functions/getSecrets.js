const contentsOfDotEnvFile = require("./config.json");
const configurations = contentsOfDotEnvFile["config"];
/**
 * @returns {{clientId, secret, webhookId}}
 */
const getSecrets = {
  /**
   *
   * @param {String} provider
   * @param {String} clientId
   * @return {Map<String, any>} clientId: {String}, secret: {String}, tags:
   * {Array<String>}, webhookId: {String}>}
   */
  fromClientId: (provider, clientId)=>{
    const secrets = configurations.providerConfigs[provider].find((client)=>{
      return client.clientId == clientId;
    });
    return secrets;
  },
  fromWebhookId: (provider, webhookId)=>{
    const secrets = configurations.providerConfigs[provider].find((client)=>{
      return client.webhookId == webhookId;
    });
    return secrets;
  },
  fromTag: function(provider, tag) {
    const secrets = configurations.providerConfigs[provider].find((client)=>{
      return client.tags.includes(tag);
    });
    return secrets;
  },
};

module.exports = getSecrets;
