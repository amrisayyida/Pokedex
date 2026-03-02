const object = {
    name: 'John',
    age: 30,
    city: 'New York',
    color: [
        {
            name: 'red',
            hex: '#ff0000'
        },
        {
            name: 'green',
            hex: '#00ff00'
        },
        {
            name: 'blue',
            hex: '#0000ff'
        }
    ]
}

const filterColor = object.color.filter((item) => item.name === 'green');

console.log('object: ', object);

const result = {
    ...object,
    color: filterColor,
}

console.log('result: ', result);