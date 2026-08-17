/**
 * Create or delete a throwaway account for exercising the password-reset flow.
 *
 *   npx tsx scripts/tmpResetUser.ts create <email> <password>
 *   npx tsx scripts/tmpResetUser.ts delete <email>
 *
 * The flow can only be trusted if it has been run against a real record, and
 * running it against a real customer would change their password.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User';

(async () => {
  const [action, email, password] = process.argv.slice(2);
  if (!action || !email) throw new Error('usage: create <email> <password> | delete <email>');
  if (!/@magicfanoos\.test$/.test(email)) throw new Error('refusing: test accounts must end in @magicfanoos.test');

  await mongoose.connect(process.env.MONGODB_URI as string);

  if (action === 'create') {
    await User.deleteOne({ email });
    const user = await User.create({ name: 'Reset Test', email, passwordHash: password });
    console.log('created', user.email, String(user._id));
  } else if (action === 'delete') {
    const { deletedCount } = await User.deleteOne({ email });
    console.log('deleted', deletedCount);
  } else {
    throw new Error(`unknown action ${action}`);
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
