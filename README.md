element-queries
===============

experimental: Media queries extended for elements

```css
.widget {
    width:100px;
    height:100px;
    background:blue;
}

 @media only screen and (element: .widget) and (element-width: 100px) {
    .widget {
        background:green;
    }
}
```

see the test.html file for more. Call the script after pageload via 
```js
elementQueries.parse();
```
