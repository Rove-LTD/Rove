const contentsOfDotEnvFile = require("./config.json");
const configurations = contentsOfDotEnvFile["config"];
/**
 *
 */
const getSecrets = {
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
      return client.tag == tag;
    });
    return secrets;
  },
};

module.exports = getSecrets;
