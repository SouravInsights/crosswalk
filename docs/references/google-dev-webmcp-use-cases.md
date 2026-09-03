![Alexandra Klepper](https://web.dev/images/authors/alexandraklepper.jpg) Alexandra Klepper [GitHub](https://github.com/alexandrascript) [Bluesky](https://bsky.app/profile/alexandrascript.com)

<br />


Published: May 18, 2026

<br />

| Explainer | Web | Extensions | Chrome Status | Intent |
|---|---|---|---|---|
| [GitHub](https://github.com/webmachinelearning/webmcp) | [![Origin trial](https://developer.chrome.com/static/images/experiment.svg) Origin trial](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241) |   | [View](https://chromestatus.com/feature/5117755740913664) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/gmYffo5WOE8/m/OJxuQRP3AAAJ) |

There are many possible uses for WebMCP. In this document, you learn how you
can implement WebMCP, in support of users and their agents. You read about
this process from the user and agent's perspective, with recommendations for
tools you could provide to support a *critical user journey* (CUJ).

> [!IMPORTANT]
> **Key Term:** A CUJ defines a user's path to accomplish a goal, including any required context. To run through a full exercise creating a CUJ, read the [User Journey Mapping](https://designsprintkit.withgoogle.com/methodology/phase1-understand/user-journey-mapping) design sprint kit.

## Help users make purchases

Developers for retail stores are great candidates for WebMCP. While there are
some circumstances in which a user likely wants to hand pick an item, such as a
finding the missing piece of their collection, there are other circumstances
where the task just needs to get done. This may be their weekly grocery list,
party planning, or reordering favorite purchases.

Our user for these shopping CUJs is Jesse. Jesse doesn't want to spend time
searching across categories to find exactly what they're looking for. Instead,
they rely on their browser agent to support their shopping needs, making it
faster to find the things they want and quicker to check out.

### Support shopping journey

Jesse has decided to shop for supplies for their kid's 10th birthday party. The party's theme is outer space, and Jesse has already written a shopping list. Some supplies may need to come from specialized grocery stores, others from big-box stores, and some from specialty party suppliers.

Jesse asks their browser agent, "Find me the best prices for the products on my shopping list at two or three local stores. Build my wishlist for me so I can finish checkout. Let me know if there are products that can't be found."

Jesse has made some assumptions when asking this question. This includes that
the agent won't add the same item across multiple carts. If two stores have an
item, the agent will determine which has the lower cost and add it to that cart.
Jesse also assumes that local stores are local to her in Springfield.

Whether you're a developer for a local business, Space Shoppe, with a large volume of party supplies to recommend for kids, or a developer at a massive grocery chain, you could build tools to support Jesse's agent.

- `search_products()` for Jesse to find possible items in a category that meet the expectation of the shopping list. For example, `productType="wall-decorations"` , `category="planets"`, and `age="child"`.
- `add_to_wishlist()` for Jesse to review all of the items before adding them to their cart.
- If Jesse asks for all products to cost less than a certain amount, you can offer a tool to refine the search, such as `refine_search(priceRange = "0-49.99")`.

### Support repeat purchases

Jesse loved the cheese sticks from Example Grocery Company, but can't quite
remember what the brand was. Jesse asks their agent, "Can you reorder the
cheese sticks I bought last month?"

If you don't offer a subscription service, you can still help customers order
the same product again with their agent. As the developer for Example Grocery
Company, you may want to offer the following tools:

- `get_order_history(startdate="",enddate="",)` which returns details of product with date of order and delivery status.
- `add_to_wishlist(productId="XYZ", quantity = 1)` for Jesse to review all of the items before adding them to their cart.
- `delivery(method="pickup")`

The agent responds to Jesse, "I found your order of Cheddar Peelers from March,
7. I've added one package to your cart. Would you like to proceed to checkout?"
Jesse can then quickly checkout from Example Grocery Company to order just
the Cheddar Peelers, or continue to browse and purchase other products.

## Help users fill in forms

Autofill is an incredibly useful browser feature that, when deployed correctly,
can [lower the abandonment rate of forms by 75%](https://developer.chrome.com/blog/autofill-insights-2024).
While we encourage you to
[build forms with autofill](https://web.dev/learn/forms/autofill), we can
further improve the rates of completion with the help of WebMCP.

WebMCP supports users' agents filling out long forms quickly and correctly.
In the next sections, we guide Charlie in filling out various complex forms.

### Manage work

Charlie works in IT at a law firm, and he hired a contractor to design the firm
a new website. Managing expenses and timesheets has been very painful,
especially as it has different expectations from the timesheets for the attorneys.

You work for a work management software company, and you want to make it easier
for all of the vendors and attorneys to input their timesheets with the correct
context, so the company bills the right amount of money to the right department.
You can add a WebMCP tool to support Charlie's contractors and attorneys use an
agent to input daily timesheet tasks.

    <form toolname="add-to-timesheet"
      tooldescription="Report billing task and time to add to the timesheet."
      toolautosubmit>

      <fieldset>
        <label for="date">Date</label>
        <input name="date" type="datetime-local" toolparamdescription="Date of work.">

        <label for="task_category">Task category</label>
        <select id="task_category" name="task_category"
        toolparamdescription="Type of task completed per time block">
          <option value="admin">Admin</option>
          <option value="billing">Billing</option>
          <option value="client">Client meetings or communication</option>
          <option value="development">Development</option>
        </select>

        <label for="minutes_worked">Minutes working on the task</label>
        <input type="number" id="minutes_worked" name="minutes_worked" min="30" max="600"
          toolparamdescription="Minutes worked on this date and task, with a minimum of 30 and maximum of 600."
          placeholder="60">

        <label for="work_details">Details</label>
        <input name="work_details"
          toolparamdescription="Additional details of work completed, for managerial review.">

      </fieldset>
      <button type="submit">Update timesheet</button>
    </form>

### Purchase a car

Charlie is looking to buy a used car. There are some features he cares deeply about, such as the type of car, number of seats, and preferred fuel. Other features, such as the car color and amenities like a backup camera, are less important. Charlie asks his agent, "Can you help me find a family car? It must have 7 seats, take regular gas, and be a model from the last 10 years."

If your website already has a form with required and optional fields, it takes
just two steps to transform your form into a WebMCP tool.

### HTML

    <form toolname="search_cars"
      tooldescription="Search for cars based on various criteria such as type, seats, year, fuel, and features."
      toolautosubmit>

      <fieldset>
        <label for="car_type">Car Type</label>
        <select id="car_type" name="car_type" toolparamdescription="Type of car">
          <option value="">Any</option>
          <option value="family">Family Car</option>
          <option value="suv">SUV</option>
          <option value="sedan">Sedan</option>
        </select>

        <label for="seats">Min Seats</label>
        <input type="number" id="seats" name="seats" min="1" max="9"
          toolparamdescription="Minimum number of seats required"
          placeholder="7">

        <label for="min_year">Minimum Year</label>
        <input type="number" id="min_year" name="min_year" min="1900" max="2026"
          toolparamdescription="Find cars made after a specific year"
          placeholder="2016">
      </fieldset>

      <fieldset>
        <legend>Preferences</legend>

        <label for="fuel_type">Fuel Type</label>
        <select id="fuel_type" name="fuel_type" toolparamdescription="Preferred fuel type">
          <option value="">Unleaded regular</option>
          <option value="">Unleaded premium</option>
          <option value="diesel">Diesel</option>
          ...
        </select>

        <div>
          <input type="checkbox" id="has_ac" name="has_ac" value="true"
            toolparamdescription="Check if air conditioning is required">
          <label for="has_ac">Air Conditioning (AC)</label>
        </div>
      </fieldset>

      <button type="submit">Search Cars</button>
    </form>

### JavaScript

    search_cars({car_type, seats, min_year, fuel_type, has_ac, ... })

### Warranty claim

Charlie wants to file a warranty claim for his TV. He lands on the main page of
the website he ordered the TV from. Immediately he states his intent to an
agent:
> "Go to the support page and file a warranty claim for my TV. The screen won't
> turn on. The serial number is XYZ-987. Use my saved details for the rest."

The Agent using WebMCP tools starts the claim process and fills in all the needed information. If the Agent needs more information it can ask the user to either provide it to the agent or fill in the form manually and submit it.

- `start_claim_process()` to navigate to the correct form.
- `populate_product_details(serial_number, purchase_date)` to input the specific product and date information.
- `describe_issue(issue_description)` to fill the long-text field with the fault description from the user's prompt.
- `populate_contact_info(name, email, phone)`

By providing WebMCP tools in this case we are helping users with agents navigate
the website without a need to understand where to find a warranty claim form.
Charlie was able to successfully fulfil his user journey without a need of
detailed understanding of the website structure.

### Request for event services

Charlie and Jesse are getting married in September, and they want to hire a caterer. There are dozens of caterers available in their area, and they want to make sure each request has the required information and asks for the same type of service.

Charlie asks his agent:
> "Can you submit an inquiry for caterers based in Springfield, for our wedding on September 8, 2026? We want a vegetarian menu for 100 guests. Two of our guests have dietary restrictions and will require special meals, including a kosher meal and a gluten-free meal. We want to include beer and wine only."

Help Charlie's agent submit an inquiry to your catering company, by adding
these tools:

- `start_event_request()`
- `create_wedding_reception(guests=100,date="September 8, 2026")`
- `add_dietary_restrictions(restrictions=["kosher","gluten-free"], guests = 2)`
- `select_drink_package(package = "Light")`
- `submit_event_request()`

## Help users filter information

There are many types of sites with large collections of items that have complex filters. There may be hundreds or thousands of listings, each with a unique combination of features that may be sought out by a user. For example, this can include housing rental websites, hotel booking sources, and ticketing sites.

In this section, we help Dana find relevant options for her specific preferences.

### Find relevant home listings

Dana is moving to a new city with her family and needs to find an apartment. All of the home sites list different information, some have photos, some have several different types of filters including price, bedrooms, bathrooms, and other features. Some listings have an exact location, while others may list just the neighborhood.

Dana asks her agent:
> "Show me apartments available to rent in Brooklyn that are less than a 10 minute walk of an A train station, and less than one hour to Tribeca. The apartment must have at least three bedrooms and a dishwasher. It would be nice to have a washer and dryer in-unit or in the building. Our budget is $4500 dollars."

You can help Dana's agent find suitable, relevant rentals by adding agent-friendly filtration to your listings site:

### Search

    search(
      max-price=4500,
      location="Brooklyn",
      features=["dishwasher"],
      rooms=3,
      optionalFeatures=["washer-dryer"]
    )

### Apply filters

    apply_filters(
      transit="train",
      max_time="1 hour",
      destination="Tribeca"
    )

The agent uses these functions to parse property metadata and ensure results meet all requirements (including 3 bedrooms and a dishwasher). In response, the agent returns a map with pins that link to specific listings, the total distance from Tribeca. Pins are in a different color if they have the optional feature, a washer and dryer, in the listing.

### Book travel

Dana and her wife, Rosario, are planning a vacation to Berlin, Germany. Dana wants to find hotel options that meet their criteria, providing a comfortable stay at a cost they can afford. Dana asks her agent: "Find me a few hotels in Berlin, Germany under $300 a night, with a pool and breakfast included."

You are a developer for a travel booking service, that looks to find people
great travel deals:

### Search

    search_hotels(location = "Berlin", guests = 2)

### Apply filters

    filter_search_results(max_price=300,amenities=["pool","restaurant"])

Dana's agent returns three hotels that meet the criteria, and asks, "Would you
like me to show you more options? Or are there additional criteria to consider?"

## Share your feedback

What types of user journeys do you think can benefit from WebMCP? Are there
additional features that can be added to the APIs to meet your expectations?
If you try these APIs and have feedback, we'd love to hear it.

- [Read the WebMCP explainer](https://github.com/webmachinelearning/webmcp), raise questions and participate in discussion.
- Review the implementation for Chrome on [Chrome Status](https://chromestatus.com/feature/5117755740913664).
- [Join the early preview program](http://goo.gle/chrome-ai-dev-preview-join) for an early look at new APIs and access to our mailing list.
- If you have feedback on Chrome's implementation, file a [Chromium bug](https://crbug.com/new?component=2021259).