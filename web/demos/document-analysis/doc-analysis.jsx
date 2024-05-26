import Chat from '../chat/chat';

export default function DocAnalysis() {
	return (
		<Chat
			fullWidth={true}
			docAnalysisMode={true}
			initialMessage={`I've been trained on the scripts of the season two of Star Trek TNG ([example here](https://www.st-minutiae.com/resources/scripts/148.txt)). You can use to to make complex search queries, analyze the scripts, make inferences, and more.`}
			examples={[
				`How many different directors did the season have?`,
				`How many episodes feature Q?`,
				`How did the relationship between Geordie and Data progress over the season?`
			]}
			additionalContextIds={['st-s2']}
		/>
	);
}
