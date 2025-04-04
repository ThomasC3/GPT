//
//  DataSource.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

open class DataSource<T>: NSObject {

    public override init() {
        super.init()
        refresh()
    }

    open var manualSections = [Section]()

    /// Sections which comprise the `DataSource`
    open var sections: [Section] {
        get { return manualSections }
        set { manualSections = newValue }
    }

    open var isEmpty: Bool {
        return sections.allSatisfy { $0.rows.isEmpty }
    }

    /// By default, this function will clear all of the `DataSource`'s sections.
    /// This function should be overridden to refresh the `DataSource` to a desired state.
    open func refresh() {
        sections = []
    }

    /// Returns the `Section` in the `DataSource` which corresponds to the given `IndexPath`
    open func section(at indexPath: IndexPath) -> Section {
        return sections[indexPath.section]
    }

    /// Returns the value in the `DataSource` which corresponds to the given `IndexPath`
    open func value(at indexPath: IndexPath) -> T {
        return sections[indexPath.section].rows[indexPath.row]
    }

    /// Removes the row in the `DataSource` which corresponds to the given `IndexPath`
    open func deleteRow(at indexPath: IndexPath) {
        sections[indexPath.section].rows.remove(at: indexPath.row)
    }

    /// Moves a value at a given `IndexPath` postion to a new `IndexPath` position in the DataSource
    ///
    /// - Parameters:
    ///   - sourceIndexPath: Original `IndexPath` of the value that is desired to be moved
    ///   - destinationIndexPath: Destination `IndexPath` that the value will be moved to
    open func moveRow(from sourceIndexPath: IndexPath, to destinationIndexPath: IndexPath) {
        let source = sections[sourceIndexPath.section].rows.remove(at: sourceIndexPath.row)
        sections[destinationIndexPath.section].rows.insert(source, at: destinationIndexPath.row)
    }

    /// Returns the `IndexPath` of the the given value in the `DataSource`, if it is found in the `DataSource`
    open func indexPath<U: Equatable>(of otherValue: U) -> IndexPath? {
        return indices.lazy.first {
            value(at: $0) as? U == otherValue
        }
    }
}

extension DataSource {

    public class Section {

        /// Title of the section
        public var title: String?

        /// Item which can be associated with this section
        public var item: Any?

        /// Rows which make up this section
        public var rows: [T]

        public init(title: String? = nil, rows: [T] = [], item: Any? = nil) {
            self.title = title
            self.rows = rows
            self.item = item
        }
    }
}

extension DataSource: Collection {

    /// Value at the given indexPath
    public subscript(indexPath: IndexPath) -> T {
        return value(at: indexPath)
    }

    /// First `IndexPath` in the `DataSource`
    public var startIndex: IndexPath {
        return IndexPath(row: 0, section: 0)
    }

    /// Last `IndexPath` in the `DataSource`
    public var endIndex: IndexPath {
        let lastRow = sections.last?.rows.count ?? 0
        return IndexPath(row: lastRow, section: sections.count)
    }

    /// Returns the `IndexPath` after the given `IndexPath` in the `DataSource`
    public func index(after i: IndexPath) -> IndexPath {
        if sections.isEmpty {
            return endIndex
        }

        let currentRowCount = sections[i.section].rows.count
        var next = i

        if i.row < currentRowCount {
            next.row += 1
        }

        if i.row >= currentRowCount - 1 {
            next.section += 1
            next.row = 0
        }

        if next.section >= sections.count {
            return endIndex
        }

        return next
    }
}
