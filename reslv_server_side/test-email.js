import { sendInviteEmail } from "./utils/mailer.js";

sendInviteEmail("nafis40m0@gmail.com", "admin", "test-token", "Test Co").then(r => console.log(r));
