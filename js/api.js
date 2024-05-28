// api.js
export default async function api(endpoint, method, data) {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Token não encontrado no localStorage');
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const options = {
    method: method,
    headers: headers
  };

  if (method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('Erro na requisição API:', error);
    throw new Error('Erro na requisição API');
  }
}
