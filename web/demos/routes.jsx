import BlogMaker from './blogmaker/blogmaker.jsx';
import Chat from './chat/chat.jsx';
import ChatWithPdf from './chat-with-pdf/chat-with-pdf.jsx';
import DemoList from './list.jsx';
import DocAnalysis from './document-analysis/doc-analysis.jsx';
import ImageGen from './image-generation/image-gen.jsx';
import PFPMaker from './pfp-maker/pfp-maker.jsx';
import PhotoTranslate from './photo-translate/photo-translate.jsx';

export const routes = [
	{
		path: '',
		element: <DemoList />
	},
	{
		path: 'chat/:uuid?',
		element: (
			<Chat
				fullWidth={true}
				initialMessage={`Hi, I'm the StartKit.AI demo chat bot! I can answer questions about anything!`}
				examples={[
					`What is the prime directive?`,
					`Summarize this Wikipedia article: https://en.wikipedia.org/wiki/Holodeck`,
					`Create me an image of the USS Enterprise in orbit over an alien planet.`,
					`Summarize this YouTube video for me: https://www.youtube.com/watch?v=vjuQRCG_sUw`
				]}
			/>
		)
	},
	{
		path: 'chat-with-pdf/:uuid?',
		element: <ChatWithPdf />
	},
	{
		path: 'image-generation',
		element: <ImageGen />
	},
	{
		path: 'pfp-maker',
		element: <PFPMaker />
	},
	{
		path: 'video-tldr',
		element: null
	},
	{
		path: 'doc-analysis',
		element: <DocAnalysis />
	},
	{
		path: 'photo-translate',
		element: <PhotoTranslate />
	},
	{
		path: 'blogmaker',
		element: <BlogMaker />
	}
];
