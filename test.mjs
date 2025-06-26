const url = 'https://api.murf.ai/v1/speech/voices';
const options = {
  method: 'GET',
  headers: {
    'api-key': 'ap2_2fb5c142-2629-41a2-87ac-7553ae5dc1fa'
  }
};
try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}