import Chat from './chat.jsx';
import Header from '../components/header.jsx';

const SharedChat = () => {
	return (
		<>
			<Header />
			<Chat
				fullWidth={true}
				readOnlyMode={true}
				initialMessage={`Hi, I'm the StartKit.AI demo chat bot! I can answer questions about anything!`}
				examples={[
					`What is the prime directive?`,
					`Summarize this Wikipedia article: https://en.wikipedia.org/wiki/Holodeck`,
					`Create me an image of the USS Enterprise in orbit over an alien planet.`,
					`Summarize this YouTube video for me: https://www.youtube.com/watch?v=vjuQRCG_sUw`
				]}
			/>
		</>
	);
};

export default SharedChat;
