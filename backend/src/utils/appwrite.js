import { Client, Account } from "node-appwrite";

const createSessionClient = (jwt) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID);

    if (jwt) {
        client.setJWT(jwt);
    }

    return {
        get account() {
            return new Account(client);
        }
    };
};

export { createSessionClient };