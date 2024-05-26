import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SearchComponent = () => {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');

	const handleInputChange = (event) => {
		setEmail(event.target.value);
	};

	const handleKeyDown = async (event) => {
		if (event.key === 'Enter') {
			navigate(`/admin/users?email=${email}`);
		}
	};

	return (
		<input
			className="input input-sm rounded-full max-sm:w-24"
			type="text"
			value={email}
			onChange={handleInputChange}
			onKeyDown={handleKeyDown}
			placeholder="Search user by email"
		/>
	);
};

export default SearchComponent;
