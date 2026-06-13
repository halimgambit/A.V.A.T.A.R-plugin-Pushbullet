import fetch from "node-fetch";

export async function init () {
    await Avatar.lang.addPluginPak('Pushbullet');
}

export async function action(data, callback) {

  try {

     const L = await Avatar.lang.getPak('Pushbullet', data.language);
        
    const tblActions = {
      sendPush : () => Contact(data, data.client, L, callback)
    };
        
    info("Pushbullet:", data.action.command, "from", data.client);
            
    if (tblActions[data.action.command]) {
			await tblActions[data.action.command]();
		}

  } catch (err) {
    if (data.client) Avatar.Speech.end(data.client);
    if (err.message) error(err.message);
  } 
        
}

const Contact = (data, client, L, callback) => {

  const sentence = (data.rawSentence || data.sentence || "").toLowerCase();
  const contacts = Config.modules.Pushbullet.contacts;

  const foundContactName = Object.keys(contacts).find(key =>
    sentence.includes(key.toLowerCase())
  );

  if (!foundContactName) {
    Avatar.speak(L.get("speech.noContact"), client);
    return callback();
  }

  const contactObj = {
    name: foundContactName,
    value: contacts[foundContactName]
  };
  
  askMessage(client, contactObj, L, callback);
}

const askMessage = (client, contact, L, callback) => {
  Avatar.askme(L.get("speech.askSms"), client,
    {
      "*": "generic",
      "annule": "cancel",
      "annulé": "cancel",
      "terminer": "cancel",
      "terminé": "cancel"
    },
    15,
    async (answer, end) => {
      end(client);

      if (answer === "cancel") {
        Avatar.speak(L.get("speech.cancel"), client);
        return callback();
      }

      const message = answer.replace("generic:", "").trim();

      try {
        info(`Pushbullet Debug - Envoi à: ${contact.name} (${contact.value}) - Contenu: "${message}"`);

        await sendSMS(contact.value, message);
        
        Avatar.speak(L.get("speech.sendSms", contact.name), client);
      } catch (err) {
        Avatar.speak(L.get("speech.noSms"), client);
        error("Pushbullet:", err);
      }
      callback();
    }
  );
}

const sendSMS = async (phone, message) => {

  const payload = {
    data: {
      addresses: [phone],
      message: message,
      target_device_iden: Config.modules.Pushbullet.DEVICE_IDEN
    }
  };

  const res = await fetch("https://api.pushbullet.com/v2/texts", {
    method: "POST",
    headers: {
      "Access-Token": Config.modules.Pushbullet.Access_Token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Pushbullet create-text error " + res.status + " : " + txt);
  }
  return await res.json();
}
