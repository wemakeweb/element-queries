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
The ```(element: .widget)``` should match elements selected via 'querySelectorAll'
You can use the following conditions:
```
element-min-width,
element-max-width,
element-width,
element-min-height,
element-max-height,
element-height
```

for example
```css
 @media only screen and (element: .widget) and (element-max-height: 30px)
```

