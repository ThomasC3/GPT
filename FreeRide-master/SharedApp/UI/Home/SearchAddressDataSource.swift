//
//  SearchAddressDataSource.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/16/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import UIKit
import GooglePlaces

struct SearchAddressItem {
    let result: GMSAutocompletePrediction?
}

class SearchAddressDataSource: TableDataSource<SearchAddressItem> {

    var isPickup = false
    
    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(SearchAddressTableViewCell.self)
    }

    func refresh(results: [GMSAutocompletePrediction]?, isPickup: Bool) {
        refresh()
        self.isPickup = isPickup
        var items : [SearchAddressItem] = []
        
        if isPickup {
            items.append(SearchAddressItem(result: nil))
        }
        
        if let results = results {
            results.forEach { items.append(SearchAddressItem(result: $0)) }
        }
        
        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(SearchAddressTableViewCell.self, for: indexPath)
        cell.configure(with: item, isPickup: isPickup)

        return cell
    }
}
