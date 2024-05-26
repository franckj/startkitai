import { useCallback, useState } from 'react';

export default function ImageUpload({ onSubmit }) {
	const [thumbnail, setThumbnail] = useState(null);
	const [isLoading, setLoading] = useState(false);
	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (file && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setThumbnail(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const start = useCallback(
		async (e) => {
			setLoading(true);
			e.preventDefault();
			const file = e.currentTarget['uploaded-image'].files[0];
			await onSubmit(file);
			setLoading(false);
		},
		[onSubmit]
	);

	return (
		<div className="mt-5">
			<form onSubmit={start}>
				<div className="flex gap-3 flex-col justify-center items-center ">
					<div className="w-full md:h-[180px] md:w-1/2 relative grid grid-cols-1 md:grid-cols-3 md:rounded-tr-lg md:rounded-br-lg">
						<div className="h-[180px] md:rounded-l-lg p-4 bg-neutral flex flex-col justify-center items-center">
							<label
								className="btn cursor-pointer hover:opacity-80 inline-flex items-center shadow-md my-2 px-2 py-2 border border-transparent
        rounded-md font-semibold text-xs uppercase tracking-widest  focus:outline-none
       focus:ring disabled:opacity-25 transition ease-in-out duration-150"
								htmlFor="uploaded-image"
							>
								Select image
								<input
									accept="image/*"
									onChange={handleImageChange}
									id="uploaded-image"
									className="text-sm cursor-pointer w-36 hidden"
									type="file"
								/>
							</label>
						</div>
						<div className="h-[180px] relative order-first md:order-last md:h-auto flex justify-center items-center border border-dashed border-gray-400 md:border-l-0 col-span-2 md:rounded-br-lg md:rounded-tr-lg bg-no-repeat bg-center bg-origin-padding bg-cover">
							<span className="text-gray-400 opacity-75">
								{thumbnail ? (
									<img src={thumbnail} alt="Thumbnail" className="w-auto max-h-[160px]" />
								) : (
									<svg
										className="w-14 h-14"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth="0.7"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
										/>
									</svg>
								)}
							</span>
						</div>
					</div>
				</div>
				<div className="mt-5 flex items-center justify-center">
					<button className="btn btn-wide btn-primary" type="submit">
						{isLoading ? (
							<span className="loading loading-spinner loading-xs"></span>
						) : (
							<span>Create profile pic</span>
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
